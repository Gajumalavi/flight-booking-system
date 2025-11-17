package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.dto.BookingCreateRequest;
import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.BookingStatus;
import com.example.ticket_booking_backend.model.Passenger;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.repository.BookingRepository;
import com.example.ticket_booking_backend.repository.PassengerRepository;
import com.example.ticket_booking_backend.repository.SeatRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private static final Logger logger = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final SeatRepository seatRepository;
    private final PassengerRepository passengerRepository;
    private final WebSocketService webSocketService;
    private final EmailService emailService;
    
    // Booking payment timeout in minutes (default is 30 minutes)
    @Value("${app.booking.payment.timeout:30}")
    private int bookingPaymentTimeoutMinutes;

    @Autowired
    public BookingService(BookingRepository bookingRepository, 
                         SeatRepository seatRepository,
                         PassengerRepository passengerRepository,
                         @Lazy WebSocketService webSocketService,
                         EmailService emailService) {
        this.bookingRepository = bookingRepository;
        this.seatRepository = seatRepository;
        this.passengerRepository = passengerRepository;
        this.webSocketService = webSocketService;
        this.emailService = emailService;
    }

    @Transactional(readOnly = true)
    public List<Booking> getUserBookings(User user) {
        logger.info("BookingService.getUserBookings called for user ID: {}", user.getId());
        try {
            List<Booking> bookings = bookingRepository.findByUser(user);
            logger.info("BookingRepository returned {} bookings for user ID: {}", bookings.size(), user.getId());
            
            if (bookings.isEmpty()) {
                logger.info("No bookings found for user ID: {}", user.getId());
            } else {
                // Only log booking IDs, not full details
                logger.debug("Found bookings with IDs: {}", bookings.stream()
                        .map(b -> b.getId().toString())
                        .collect(Collectors.joining(", ")));
            }
            
            return bookings;
        } catch (Exception e) {
            logger.error("Error retrieving bookings for user ID: " + user.getId(), e);
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public Page<Booking> getUserBookingsPageable(User user, Pageable pageable) {
        return bookingRepository.findByUser(user, pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<Booking> getUserBookingsWithFilters(
            User user,
            String status,
            Long flightId,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Pageable pageable) {
        
        // Convert string status to enum if provided
        BookingStatus bookingStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                bookingStatus = BookingStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                // If invalid status is provided, ignore it
                logger.warn("Invalid booking status provided: {}", status);
            }
        }
        
        // Log the query parameters for debugging
        logger.debug("Filter query parameters: user={}, status={}, flightId={}, startDate={}, endDate={}",
                    user.getId(), bookingStatus, flightId, startDate, endDate);
        
        // Use the repository method to find bookings with filters
        try {
            // Use simple query forms based on filter combinations to avoid transaction issues
            if (startDate == null && endDate == null) {
                // If no date filters, use simpler query
                if (bookingStatus != null && flightId != null) {
                    logger.info("Using query by user, status, and flightId");
                    return bookingRepository.findByUserAndStatusAndFlightId(user, bookingStatus, flightId, pageable);
                } else if (bookingStatus != null) {
                    logger.info("Using query by user and status");
                    return bookingRepository.findByUserAndStatus(user, bookingStatus, pageable);
                } else if (flightId != null) {
                    logger.info("Using query by user and flightId");
                    return bookingRepository.findByUserAndFlightId(user, flightId, pageable);
                }
            }
            
            // Use complex query only when really needed (when dates are involved or for all filters)
            logger.info("Using complex query with all filters");
            return bookingRepository.findBookingsWithFilters(
                user, 
                bookingStatus, 
                flightId, 
                startDate, 
                endDate, 
                pageable
            );
        } catch (Exception e) {
            logger.error("Error executing booking filter query: {}", e.getMessage(), e);
            
            // Fallback to basic query in case of errors
            logger.info("Falling back to basic query by user only");
            return bookingRepository.findByUser(user, pageable);
        }
    }

    @Transactional(readOnly = true)
    public Optional<Booking> getBookingById(Long bookingId) {
        return bookingRepository.findById(bookingId);
    }
    
    /**
     * Get a booking with all associations eagerly loaded for email sending purposes
     * This avoids LazyInitializationException when sending emails asynchronously
     */
    @Transactional(readOnly = true)
    public Optional<Booking> getBookingWithDetailsForEmail(Long bookingId) {
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        
        if (bookingOpt.isPresent()) {
            Booking booking = bookingOpt.get();
            
            // Initialize collections by accessing them within transaction
            if (booking.getPassengers() != null) {
                booking.getPassengers().size(); // Force initialization
                
                // Initialize seat for each passenger
                for (Passenger passenger : booking.getPassengers()) {
                    if (passenger.getSeat() != null) {
                        passenger.getSeat().getSeatNumber(); // Force initialization
                    }
                }
            }
            
            // Initialize seats
            if (booking.getSeats() != null) {
                booking.getSeats().size(); // Force initialization
                for (Seat seat : booking.getSeats()) {
                    seat.getSeatNumber(); // Force initialization
                }
            }
            
            // Flight details
            if (booking.getFlight() != null) {
                booking.getFlight().getFlightNumber(); // Force initialization
            }
        }
        
        return bookingOpt;
    }

    @Transactional
    public Booking createBooking(User user, Long flightId, List<Seat> seats) {
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setFlight(seats.get(0).getFlight());  // Assuming all seats are for the same flight
        booking.setSeats(seats);
        booking.setBookingTime(LocalDateTime.now());
        booking.setStatus(BookingStatus.PENDING);
        
        return bookingRepository.save(booking);
    }
    
    /**
     * Create a booking and update seat status in a single transaction
     */
    @Transactional
    public Booking createBookingWithSeats(User user, Long flightId, List<Seat> seats) {
        // Create and save the booking
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setFlight(seats.get(0).getFlight());  // Assuming all seats are for the same flight
        booking.setSeats(seats);
        booking.setBookingTime(LocalDateTime.now());
        booking.setStatus(BookingStatus.PENDING);
        
        Booking savedBooking = bookingRepository.save(booking);
        
        // Update all seats
        for (Seat seat : seats) {
            seat.setAvailable(false);
            seat.setBooked(false);  // Not fully booked yet, just reserved
            seat.setReserved(true); // Add this field to the Seat model
            seatRepository.save(seat);
            
            // Notify WebSocket subscribers about seat update
            webSocketService.notifySeatUpdate(
                seat.getFlight().getId(),
                seat.getId(),
                false,
                "RESERVED",
                System.currentTimeMillis()
            );
        }
        
        // Send booking confirmation email
        try {
            logger.info("Sending booking confirmation email for booking ID: {}", savedBooking.getId());
            emailService.sendBookingConfirmationEmail(savedBooking, user);
        } catch (Exception e) {
            logger.error("Failed to send booking confirmation email: {}", e.getMessage(), e);
            // Don't rethrow - we don't want email failures to break the booking process
        }
        
        return savedBooking;
    }
    
    /**
     * Create a booking with passenger information
     */
    @Transactional
    public Booking createBookingWithPassengers(
            User user, 
            Long flightId, 
            List<Seat> seats, 
            List<BookingCreateRequest.PassengerInfo> passengerInfos) {
        
        // Create and save the booking
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setFlight(seats.get(0).getFlight());  // Assuming all seats are for the same flight
        booking.setSeats(seats);
        booking.setBookingTime(LocalDateTime.now());
        booking.setStatus(BookingStatus.PENDING);
        
        Booking savedBooking = bookingRepository.save(booking);
        
        // Map passengerInfos to their corresponding seats
        Map<Long, BookingCreateRequest.PassengerInfo> seatPassengerMap = passengerInfos.stream()
                .collect(Collectors.toMap(
                        BookingCreateRequest.PassengerInfo::getSeatId, 
                        passengerInfo -> passengerInfo
                ));
        
        // Update all seats and create passengers
        for (Seat seat : seats) {
            seat.setAvailable(false);
            seat.setBooked(false);  // Not fully booked yet, just reserved
            seat.setReserved(true); // Add this field to the Seat model
            seatRepository.save(seat);
            
            // Create passenger for this seat if info is provided
            BookingCreateRequest.PassengerInfo passengerInfo = seatPassengerMap.get(seat.getId());
            if (passengerInfo != null) {
                Passenger passenger = new Passenger();
                passenger.setFirstName(passengerInfo.getFirstName());
                passenger.setLastName(passengerInfo.getLastName());
                passenger.setEmail(passengerInfo.getEmail());
                passenger.setPhone(passengerInfo.getPhone());
                passenger.setAge(passengerInfo.getAge());
                passenger.setSeat(seat);
                passenger.setBooking(savedBooking);
                
                passengerRepository.save(passenger);
                savedBooking.getPassengers().add(passenger);
            }
            
            // Notify WebSocket subscribers about seat update
            webSocketService.notifySeatUpdate(
                seat.getFlight().getId(),
                seat.getId(),
                false,
                "RESERVED",
                System.currentTimeMillis()
            );
        }
        
        // Don't send booking confirmation email here - it will be sent after payment
        // We'll only log the booking creation
        logger.info("Created booking ID: {}, confirmation email will be sent after payment", savedBooking.getId());
        
        return savedBooking;
    }

    @Transactional
    public boolean cancelBooking(Long bookingId, Long userId) {
        logger.info("Attempting to cancel booking with ID: {} for user ID: {}", bookingId, userId);
        
        // Check if booking exists
        Optional<Booking> bookingOpt = bookingRepository.findById(bookingId);
        if (bookingOpt.isEmpty()) {
            logger.error("Cancellation failed: Booking with ID {} does not exist", bookingId);
            return false;
        }
        
        Booking booking = bookingOpt.get();
        logger.info("Found booking {} with status: {}, owned by user ID: {}", 
            bookingId, booking.getStatus(), booking.getUser().getId());
        
        // Check if booking belongs to user
        if (!booking.getUser().getId().equals(userId)) {
            logger.error("Cancellation failed: Booking {} belongs to user ID: {}, not requesting user ID: {}", 
                bookingId, booking.getUser().getId(), userId);
            return false;
        }
        
        // Check if booking is in CONFIRMED or PAID status
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PAID) {
            logger.error("Cancellation failed: Booking {} has status: {}, not CONFIRMED or PAID", 
                bookingId, booking.getStatus());
            return false;
        }
        
        // Store the previous status to check if it was PAID (for email notification)
        boolean wasPaidBooking = booking.getStatus() == BookingStatus.PAID;
        
        // Update booking status to cancelled
        booking.setStatus(BookingStatus.CANCELLED);
        
        // First, delete all passenger records associated with this booking to avoid constraint violations
        List<Passenger> passengers = booking.getPassengers();
        if (passengers != null && !passengers.isEmpty()) {
            logger.info("Removing {} passenger records for booking {}", passengers.size(), bookingId);
            for (Passenger passenger : new ArrayList<>(passengers)) {
                // Remove the passenger from the booking's collection
                booking.getPassengers().remove(passenger);
                // Delete the passenger from the database
                passengerRepository.delete(passenger);
            }
        }
        
        Booking savedBooking = bookingRepository.save(booking);
        
        // Release all seats
        for (Seat seat : booking.getSeats()) {
            seat.setAvailable(true);
            seat.setBooked(false);
            seat.setReserved(false);
            seatRepository.save(seat);
            
            // Notify WebSocket subscribers about seat update
            webSocketService.notifySeatUpdate(
                seat.getFlight().getId(),
                seat.getId(),
                true,
                "AVAILABLE",
                System.currentTimeMillis()
            );
        }
        
        // Send cancellation email with refund information for paid bookings
        try {
            logger.info("Sending booking cancellation email for booking ID: {}", bookingId);
            
            // Get fully initialized booking to avoid LazyInitializationException
            Optional<Booking> emailReadyBookingOpt = getBookingWithDetailsForEmail(bookingId);
            if (emailReadyBookingOpt.isPresent()) {
                emailService.sendBookingCancellationEmail(emailReadyBookingOpt.get(), booking.getUser());
                logger.info("Successfully sent booking cancellation email for booking ID: {}", bookingId);
            } else {
                logger.error("Unable to fetch booking details for cancellation email: booking ID {}", bookingId);
            }
        } catch (Exception e) {
            logger.error("Failed to send booking cancellation email: {}", e.getMessage(), e);
            // Don't rethrow - we don't want email failures to break the cancellation process
        }
        
        logger.info("Successfully cancelled booking with ID: {}", bookingId);
        return true;
    }

    /**
     * Get bookings for a user with flight date filtering
     */
    @Transactional(readOnly = true)
    public Page<Booking> getUserBookingsWithFlightDateFilter(
            User user,
            String status,
            LocalDateTime flightDateStart,
            LocalDateTime flightDateEnd,
            Pageable pageable) {
        
        // Convert string status to enum if provided
        BookingStatus bookingStatus = null;
        if (status != null && !status.isEmpty()) {
            try {
                bookingStatus = BookingStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                // If invalid status is provided, ignore it
                logger.warn("Invalid booking status provided: {}", status);
            }
        }
        
        // Log the query parameters for debugging
        logger.debug("Flight date filter query parameters: user={}, status={}, flightDateStart={}, flightDateEnd={}",
                    user.getId(), bookingStatus, flightDateStart, flightDateEnd);
        
        try {
            // For flight date filtering, we need to use a custom query
            if (flightDateStart != null && flightDateEnd != null) {
                // If date filter is provided, use query by flight date
                logger.info("Using query by flight date");
                
                if (bookingStatus != null) {
                    // Both status and flight date
                    return bookingRepository.findByUserAndStatusAndFlightDepartureTimeBetween(
                        user, bookingStatus, flightDateStart, flightDateEnd, pageable);
                } else {
                    // Only flight date
                    return bookingRepository.findByUserAndFlightDepartureTimeBetween(
                        user, flightDateStart, flightDateEnd, pageable);
                }
            } else if (bookingStatus != null) {
                // If only status filter is provided
                logger.info("Using query by user and status");
                return bookingRepository.findByUserAndStatus(user, bookingStatus, pageable);
            } else {
                // No filters, just get all user bookings
                logger.info("Using query for all user bookings");
                return bookingRepository.findByUser(user, pageable);
            }
        } catch (Exception e) {
            logger.error("Error executing booking filter query: {}", e.getMessage(), e);
            
            // Fallback to basic query in case of errors
            logger.info("Falling back to basic query by user only");
            return bookingRepository.findByUser(user, pageable);
        }
    }

    /**
     * Save a booking (used for updating booking status)
     * 
     * @param booking The booking to save
     * @return The saved booking
     */
    @Transactional
    public Booking saveBooking(Booking booking) {
        logger.info("Saving booking with ID: {} and status: {}", booking.getId(), booking.getStatus());
        return bookingRepository.save(booking);
    }
    
    /**
     * Scheduled job to cancel pending bookings that haven't been paid within the timeout period
     * Runs every 5 minutes
     */
    @Scheduled(fixedRate = 300000) // 5 minutes
    @Transactional
    public void cancelExpiredPendingBookings() {
        logger.info("Running scheduled job to cancel expired pending bookings");
        
        try {
            // Calculate cutoff time (30 minutes ago by default)
            LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(bookingPaymentTimeoutMinutes);
            
            // Find all bookings in PENDING status created before the cutoff time
            List<Booking> expiredBookings = bookingRepository.findByStatusAndBookingTimeBefore(
                    BookingStatus.PENDING, cutoffTime);
            
            logger.info("Found {} expired pending bookings to cancel", expiredBookings.size());
            
            // Process each expired booking
            for (Booking booking : expiredBookings) {
                logger.info("Auto-cancelling expired pending booking: {}", booking.getId());
                
                // Update booking status
                booking.setStatus(BookingStatus.CANCELLED);
                bookingRepository.save(booking);
                
                // Release all seats
                for (Seat seat : booking.getSeats()) {
                    seat.setAvailable(true);
                    seat.setBooked(false);
                    seat.setReserved(false);
                    seatRepository.save(seat);
                    
                    // Notify WebSocket subscribers about seat update
                    webSocketService.notifySeatUpdate(
                        seat.getFlight().getId(),
                        seat.getId(),
                        true,
                        "RELEASED",
                        System.currentTimeMillis()
                    );
                }
                
                // Notify user by email
                try {
                    User user = booking.getUser();
                    logger.info("Sending booking cancellation email for expired booking ID: {}", booking.getId());
                    emailService.sendBookingCancellationEmail(booking, user);
                } catch (Exception e) {
                    logger.error("Failed to send booking cancellation email: {}", e.getMessage(), e);
                    // Don't rethrow - we don't want email failures to break the cancellation process
                }
            }
        } catch (Exception e) {
            logger.error("Error in scheduled job to cancel expired bookings: {}", e.getMessage(), e);
            // Log but don't throw to prevent scheduler disruption
        }
    }

    @Transactional(readOnly = true)
    public List<Booking> findBookingsByDateRange(String startDate, String endDate) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate start = LocalDate.parse(startDate, formatter);
        LocalDate end = LocalDate.parse(endDate, formatter);
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(23, 59, 59);
        return bookingRepository.findByBookingTimeBetween(startDateTime, endDateTime);
    }
} 