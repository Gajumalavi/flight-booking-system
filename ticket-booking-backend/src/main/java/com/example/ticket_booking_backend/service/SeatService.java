package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.exception.BookingException;
import com.example.ticket_booking_backend.exception.SeatHoldTimedOutException;
import com.example.ticket_booking_backend.exception.SeatNotAvailableException;
import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.repository.SeatRepository;
import com.example.ticket_booking_backend.repository.UserRepository;
import com.example.ticket_booking_backend.dto.SeatUpdateDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class SeatService {
    private static final Logger logger = LoggerFactory.getLogger(SeatService.class);

    private final SeatRepository seatRepository;
    private final WebSocketService webSocketService;
    private final UserRepository userRepository;
    private final ApplicationContext applicationContext;
    
    private BookingService bookingService;
    
    // Hold timeout in minutes (default is 5 minutes)
    @Value("${app.seat.hold.timeout:5}")
    private int seatHoldTimeoutMinutes;
    
    // Setter for testing
    public void setSeatHoldTimeoutMinutes(int timeoutMinutes) {
        this.seatHoldTimeoutMinutes = timeoutMinutes;
    }
    
    // Keep track of any scheduled tasks for seat releases in memory
    private final ConcurrentMap<String, Runnable> scheduledReleases = new ConcurrentHashMap<>();

    @Autowired
    public SeatService(SeatRepository seatRepository, 
                       @Lazy WebSocketService webSocketService,
                       UserRepository userRepository,
                       ApplicationContext applicationContext) {
        this.seatRepository = seatRepository;
        this.webSocketService = webSocketService;
        this.userRepository = userRepository;
        this.applicationContext = applicationContext;
    }
    
    @PostConstruct
    public void init() {
        // Get BookingService after all beans are initialized to prevent circular dependency
        this.bookingService = applicationContext.getBean(BookingService.class);
    }

    @Transactional(readOnly = true)
    public List<Seat> getAvailableSeats(Long flightId) {
        return seatRepository.findByFlightIdAndAvailableTrue(flightId);
    }

    /**
     * Creates a temporary hold on a seat
     * @param seatId The ID of the seat to hold
     * @param flightId The ID of the flight
     * @param userId The ID of the user holding the seat
     * @return true if the hold was successful
     * @throws SeatNotAvailableException if the seat is not available
     */
    @Transactional
    public boolean holdSeat(Long seatId, Long flightId, Long userId) {
        logger.info("Attempting to hold seat {} for flight {} by user {}", seatId, flightId, userId);
        
        return seatRepository.findById(seatId)
                .filter(seat -> seat.getFlight().getId().equals(flightId))
                .map(seat -> {
                    // Check if the seat is actually available (not booked and not on hold)
                    if (!seat.isActuallyAvailable()) {
                        throw new SeatNotAvailableException(seatId, flightId, 
                                "Seat is already " + (seat.isOnHold() ? "on hold" : "booked"));
                    }
                    
                    // Set the hold expiration time
                    LocalDateTime holdUntil = LocalDateTime.now().plusMinutes(seatHoldTimeoutMinutes);
                    seat.setHoldUntil(holdUntil);
                    seat.setHeldByUserId(userId);
                    seat.setAvailable(false); // Mark as not available while on hold
                    
                    seatRepository.save(seat);
                    
                    // Schedule automatic release of the hold after timeout
                    scheduleHoldRelease(seatId, flightId, userId, holdUntil);
                    
                    // Notify WebSocket subscribers
                    webSocketService.notifySeatUpdate(new SeatUpdateDTO(
                            flightId,
                            seatId,
                            false, // Not available during hold
                            "HELD",
                            System.currentTimeMillis()
                    ));
                    
                    logger.info("Seat {} held until {}", seatId, holdUntil);
                    return true;
                })
                .orElseThrow(() -> new SeatNotAvailableException(seatId, flightId, "Seat not found"));
    }
    
    /**
     * Schedules a task to automatically release a hold after it expires
     */
    private void scheduleHoldRelease(Long seatId, Long flightId, Long userId, LocalDateTime holdUntil) {
        String key = String.format("%d-%d-%d", flightId, seatId, userId);
        
        // Create a runnable that will release the seat after timeout
        Runnable releaseTask = () -> {
            try {
                // Wait until the hold expires
                long sleepTime = java.time.Duration.between(LocalDateTime.now(), holdUntil).toMillis();
                if (sleepTime > 0) {
                    Thread.sleep(sleepTime);
                }
                
                // Release the hold if it's still held by this user
                releaseHoldIfExpired(seatId, flightId, userId);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                logger.warn("Hold release for seat {} on flight {} was interrupted", seatId, flightId);
            } catch (Exception e) {
                logger.error("Error in automatic hold release for seat {} on flight {}: {}", 
                        seatId, flightId, e.getMessage());
            } finally {
                scheduledReleases.remove(key);
            }
        };
        
        // Store the runnable and start a new thread
        scheduledReleases.put(key, releaseTask);
        Thread releaseThread = new Thread(releaseTask);
        releaseThread.setName("seat-hold-release-" + key);
        releaseThread.setDaemon(true);
        releaseThread.start();
    }
    
    /**
     * Checks for expired seat holds periodically and releases them
     */
    @Scheduled(fixedRate = 60000) // Run every minute
    @Transactional
    public void releaseExpiredHolds() {
        logger.info("Checking for expired seat holds...");
        LocalDateTime now = LocalDateTime.now();
        
        // Find all seats with expired holds
        List<Seat> expiredHolds = seatRepository.findByHoldUntilLessThan(now);
        
        if (!expiredHolds.isEmpty()) {
            logger.info("Found {} expired seat holds to release", expiredHolds.size());
        }
        
        for (Seat seat : expiredHolds) {
            try {
                // Release the hold
                seat.setHoldUntil(null);
                seat.setHeldByUserId(null);
                seat.setAvailable(true);
                seatRepository.save(seat);
                
                // Notify WebSocket subscribers
                webSocketService.notifySeatUpdate(new SeatUpdateDTO(
                        seat.getFlight().getId(),
                        seat.getId(),
                        true,
                        "HOLD_EXPIRED",
                        System.currentTimeMillis()
                ));
                
                logger.info("Released expired hold on seat {} for flight {}", 
                        seat.getId(), seat.getFlight().getId());
            } catch (Exception e) {
                logger.error("Error releasing expired hold on seat {}: {}", 
                        seat.getId(), e.getMessage());
            }
        }
        
        // Also check for seats that are marked as unavailable but don't have a hold
        // This is to fix any inconsistencies
        try {
            List<Seat> inconsistentSeats = seatRepository.findByAvailableFalseAndBookedFalseAndHoldUntilIsNull();
            if (!inconsistentSeats.isEmpty()) {
                logger.warn("Found {} seats that are unavailable but don't have a hold - fixing inconsistency", 
                        inconsistentSeats.size());
                
                for (Seat seat : inconsistentSeats) {
                    seat.setAvailable(true);
                    seatRepository.save(seat);
                    
                    // Notify WebSocket subscribers
                    webSocketService.notifySeatUpdate(new SeatUpdateDTO(
                            seat.getFlight().getId(),
                            seat.getId(),
                            true,
                            "FIXED_INCONSISTENCY",
                            System.currentTimeMillis()
                    ));
                    
                    logger.info("Fixed inconsistent state for seat {} on flight {}", 
                            seat.getId(), seat.getFlight().getId());
                }
            }
        } catch (Exception e) {
            logger.error("Error fixing inconsistent seat states: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Releases a hold on a seat if it's expired or still held by the specified user
     */
    @Transactional
    public void releaseHoldIfExpired(Long seatId, Long flightId, Long userId) {
        logger.debug("Checking if hold has expired for seat {} on flight {} by user {}", 
                seatId, flightId, userId);
        
        seatRepository.findById(seatId)
                .filter(seat -> seat.getFlight().getId().equals(flightId))
                .ifPresent(seat -> {
                    // Only release if this seat is held by this user or the hold has expired
                    if ((userId != null && userId.equals(seat.getHeldByUserId())) || 
                            (seat.getHoldUntil() != null && seat.getHoldUntil().isBefore(LocalDateTime.now()))) {
                        
                        seat.setHoldUntil(null);
                        seat.setHeldByUserId(null);
                        seat.setAvailable(true);
                        seatRepository.save(seat);
                        
                        // Notify WebSocket subscribers
                        webSocketService.notifySeatUpdate(new SeatUpdateDTO(
                                flightId,
                                seatId,
                                true,
                                "RELEASED",
                                System.currentTimeMillis()
                        ));
                        
                        logger.info("Released hold on seat {} for flight {}", seatId, flightId);
                    }
                });
    }

    /**
     * Select a seat (mark it as temporarily unavailable)
     * This is now implemented using the holdSeat method to ensure proper timeout
     */
    @Transactional
    public boolean selectSeat(Long seatId, Long flightId) {
        try {
            // Get user ID from Security Context if possible
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            Long userId = 999L; // Default system ID
            
            if (authentication != null && authentication.isAuthenticated() && 
                    !"anonymousUser".equals(authentication.getPrincipal())) {
                // Try to extract user ID from authentication
                try {
                    String userEmail = authentication.getName();
                    userId = userRepository.findByEmail(userEmail)
                            .map(User::getId)
                            .orElse(999L);
                } catch (Exception e) {
                    logger.warn("Could not extract user ID from authentication, using default: {}", e.getMessage());
                }
            }
            
            // Use the holdSeat method to ensure proper timeout
            logger.info("Selecting seat {} for flight {} using hold mechanism with user {}", seatId, flightId, userId);
            return holdSeat(seatId, flightId, userId);
        } catch (Exception e) {
            logger.error("Error in selectSeat: {}", e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Release a previously selected or held seat
     */
    @Transactional
    public boolean releaseSeat(Long seatId, Long flightId) {
        return seatRepository.findById(seatId)
                .filter(seat -> seat.getFlight().getId().equals(flightId))
                .map(seat -> {
                    // Clear any hold
                    seat.setHoldUntil(null);
                    seat.setHeldByUserId(null);
                    seat.setAvailable(true);
                    seatRepository.save(seat);

                    // Notify WebSocket subscribers about the seat update
                    webSocketService.notifySeatUpdate(new SeatUpdateDTO(
                            flightId,
                            seatId,
                            true,
                            "RELEASED",
                            System.currentTimeMillis()
                    ));

                    // Remove any scheduled release task
                    String key = String.format("%d-%d-%d", flightId, seatId, seat.getHeldByUserId());
                    scheduledReleases.remove(key);

                    return true;
                })
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public List<Seat> getAllSeatsForFlight(Long flightId) {
        return seatRepository.findByFlightId(flightId);
    }

    /**
     * Book a seat (finalize booking)
     * This checks that the seat is held by the current user before allowing booking
     */
    @Transactional
    public boolean bookSeat(Long seatId, Long flightId) {
        // Get currently authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentUserEmail = authentication.getName();
        
        return userRepository.findByEmail(currentUserEmail)
                .flatMap(user -> seatRepository.findById(seatId)
                    .filter(seat -> seat.getFlight().getId().equals(flightId))
                    .map(seat -> {
                        // Check if this user has a valid hold
                        if (seat.isOnHold() && !user.getId().equals(seat.getHeldByUserId())) {
                            throw new SeatNotAvailableException(seatId, flightId, 
                                    "Seat is currently held by another user");
                        }
                        
                        // Check if seat is already booked
                        if (seat.isBooked()) {
                            throw new SeatNotAvailableException(seatId, flightId, "Seat is already booked");
                        }
                        
                        // Mark seat as booked
                        seat.setHoldUntil(null);
                        seat.setHeldByUserId(null);
                        seat.setAvailable(false);
                        seat.setBooked(true);
                        Seat savedSeat = seatRepository.save(seat);

                        // Create a booking record
                        try {
                            bookingService.createBooking(user, flightId, Collections.singletonList(savedSeat));
                        } catch (Exception e) {
                            throw new BookingException("Failed to create booking record", flightId, e);
                        }

                        // Notify WebSocket subscribers about the seat update
                        webSocketService.notifySeatUpdate(new SeatUpdateDTO(
                                flightId,
                                seatId,
                                false,
                                "BOOKED",
                                System.currentTimeMillis()
                        ));

                        return true;
                    }))
                .orElseThrow(() -> new SeatNotAvailableException(seatId, flightId));
    }
}