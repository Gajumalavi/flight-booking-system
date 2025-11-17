package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.dto.BookingCreateRequest;
import com.example.ticket_booking_backend.dto.BookingDTO;
import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.BookingStatus;
import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.model.Passenger;
import com.example.ticket_booking_backend.repository.SeatRepository;
import com.example.ticket_booking_backend.repository.BookingRepository;
import com.example.ticket_booking_backend.repository.PassengerRepository;
import com.example.ticket_booking_backend.security.CustomUserDetails;
import com.example.ticket_booking_backend.service.BookingService;
import com.example.ticket_booking_backend.service.EmailService;
import com.example.ticket_booking_backend.util.PdfTicketGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.TimeZone;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private static final Logger logger = LoggerFactory.getLogger(BookingController.class);
    private final BookingService bookingService;
    private final SeatRepository seatRepository;
    private final BookingRepository bookingRepository;
    private final PassengerRepository passengerRepository;
    private final PdfTicketGenerator pdfTicketGenerator;
    private final EmailService emailService;
    private final com.example.ticket_booking_backend.service.WebSocketService webSocketService;

    @Autowired
    public BookingController(
            BookingService bookingService, 
            SeatRepository seatRepository, 
            BookingRepository bookingRepository,
            PassengerRepository passengerRepository,
            PdfTicketGenerator pdfTicketGenerator,
            EmailService emailService,
            com.example.ticket_booking_backend.service.WebSocketService webSocketService) {
        this.bookingService = bookingService;
        this.seatRepository = seatRepository;
        this.bookingRepository = bookingRepository;
        this.passengerRepository = passengerRepository;
        this.pdfTicketGenerator = pdfTicketGenerator;
        this.emailService = emailService;
        this.webSocketService = webSocketService;
    }

    @GetMapping
    public ResponseEntity<List<BookingDTO>> getUserBookings(@AuthenticationPrincipal CustomUserDetails userDetails) {
        logger.info("Getting all bookings for user with ID: {}", userDetails.getId());
        
        try {
            User user = userDetails.getUser();
            logger.debug("User ID resolved: {}", user.getId());
            
            List<Booking> bookings = bookingService.getUserBookings(user);
            logger.info("Retrieved {} bookings for user ID: {}", bookings.size(), user.getId());
        
        // Convert to DTOs
        List<BookingDTO> bookingDTOs = bookings.stream()
                .map(BookingDTO::fromBooking)
                .collect(Collectors.toList());
                
            logger.info("Returning {} booking DTOs to client", bookingDTOs.size());
        return ResponseEntity.ok(bookingDTOs);
        } catch (Exception e) {
            logger.error("Error retrieving bookings for user ID: " + userDetails.getId(), e);
            throw e; // Re-throw to let global exception handler manage the response
        }
    }

    @GetMapping("/filtered")
    public ResponseEntity<?> getFilteredBookings(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long bookingId,
            @RequestParam(required = false) String flightDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "bookingTime") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        
        logger.info("Getting filtered bookings for user with ID: {}, filters: status={}, bookingId={}, flightDate={}, page={}, size={}",
                userDetails.getId(), status, bookingId, flightDate, page, size);
        
        try {
            // Parse flight date if provided
            LocalDateTime flightDateStart = null;
            LocalDateTime flightDateEnd = null;
            
            if (flightDate != null && !flightDate.isEmpty()) {
                try {
                    // Use ISO format pattern explicitly to ensure consistent parsing
                    LocalDate parsedDate = LocalDate.parse(flightDate, java.time.format.DateTimeFormatter.ISO_DATE);
                    flightDateStart = parsedDate.atStartOfDay();
                    flightDateEnd = parsedDate.atTime(23, 59, 59);
                    logger.debug("Parsed flight date: {} to period {} - {}", flightDate, flightDateStart, flightDateEnd);
                } catch (Exception e) {
                    logger.error("Error parsing flight date '{}': {}", flightDate, e.getMessage());
                    return ResponseEntity.badRequest().body(Map.of(
                        "message", "Invalid flight date format. Use ISO format (YYYY-MM-DD)",
                        "error", e.getMessage()
                    ));
                }
            }
            
            // Create Pageable object
            Sort.Direction sortDirection = direction.equalsIgnoreCase("asc") ? 
                    Sort.Direction.ASC : Sort.Direction.DESC;
            
            Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));
            
            // Get filtered and paginated bookings
            Page<Booking> bookingPage;
            
            if (bookingId != null) {
                // If bookingId is provided, fetch just that booking
                Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
                
                if (bookingOpt.isPresent() && bookingOpt.get().getUser().getId().equals(userDetails.getId())) {
                    List<Booking> singleBooking = List.of(bookingOpt.get());
                    // Create a Page from the single booking
                    bookingPage = new PageImpl<>(singleBooking, pageable, 1);
                } else {
                    // Empty result if booking doesn't exist or doesn't belong to user
                    bookingPage = Page.empty(pageable);
                }
            } else {
                // Otherwise use filters
                bookingPage = bookingService.getUserBookingsWithFlightDateFilter(
                    userDetails.getUser(),
                    status,
                        flightDateStart,
                        flightDateEnd,
                    pageable
            );
            }
            
            // Convert to DTOs
            Page<BookingDTO> bookingDTOs = bookingPage.map(BookingDTO::fromBooking);
            
            // Prepare response with pagination metadata
            Map<String, Object> response = new HashMap<>();
            response.put("bookings", bookingDTOs.getContent());
            response.put("currentPage", bookingDTOs.getNumber());
            response.put("totalItems", bookingDTOs.getTotalElements());
            response.put("totalPages", bookingDTOs.getTotalPages());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching filtered bookings", e);
            
            // Check if it's a transaction-related error
            String errorMessage = e.getMessage();
            if (errorMessage != null && (
                    errorMessage.contains("transaction is aborted") || 
                    errorMessage.contains("transaction has been rolled back") ||
                    errorMessage.contains("JDBC exception"))) {
                
                // Try to get all bookings without filters as fallback
                try {
                    logger.info("Transaction error detected, falling back to basic bookings query");
                    List<Booking> fallbackBookings = bookingService.getUserBookings(userDetails.getUser());
                    
                    // Convert to DTOs and filter in memory if needed
                    List<BookingDTO> bookingDTOs = fallbackBookings.stream()
                            .filter(b -> status == null || status.isEmpty() || b.getStatus().name().equalsIgnoreCase(status))
                            .filter(b -> bookingId == null || b.getId().equals(bookingId))
                            .map(BookingDTO::fromBooking)
                            .collect(Collectors.toList());
                    
                    // Create a simple response without pagination for fallback
                    Map<String, Object> response = new HashMap<>();
                    response.put("bookings", bookingDTOs);
                    response.put("currentPage", 0);
                    response.put("totalItems", bookingDTOs.size());
                    response.put("totalPages", 1);
                    
                    return ResponseEntity.ok(response);
                } catch (Exception fallbackError) {
                    logger.error("Fallback also failed", fallbackError);
                }
            }
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to fetch bookings: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createBooking(
            @RequestBody BookingCreateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        logger.info("Creating booking for user ID: {} with flight ID: {} and seat IDs: {}", 
                userDetails.getId(), request.getFlightId(), request.getSeatIds());
        
        try {
            // Get the seats for the booking
            List<Seat> seats = seatRepository.findAllById(request.getSeatIds());
            
            // Verify all seats exist and belong to the specified flight
            if (seats.size() != request.getSeatIds().size()) {
                logger.error("Not all seats were found for booking");
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "One or more seats not found"
                ));
            }
            
            Long flightId = Long.parseLong(request.getFlightId());
            boolean allSeatsMatchFlight = seats.stream()
                    .allMatch(seat -> seat.getFlight().getId().equals(flightId));
            
            if (!allSeatsMatchFlight) {
                logger.error("Some seats belong to different flights");
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "All seats must belong to the specified flight"
                ));
            }
            
            // Check if the flight has already departed
            if (!seats.isEmpty()) {
                Flight flight = seats.get(0).getFlight();
                LocalDateTime now = LocalDateTime.now();
                
                if (flight.getDepartureTime().isBefore(now)) {
                    logger.error("Attempted to book a flight that has already departed: Flight ID {}", flightId);
                    return ResponseEntity.badRequest().body(Map.of(
                            "message", "Cannot book a flight that has already departed"
                    ));
                }
            }
            
            // Validate passenger information if provided
            boolean hasPassengerInfo = request.getPassengers() != null && !request.getPassengers().isEmpty();
            
            // If passenger info is provided, verify each passenger has required fields and is associated with a valid seat
            if (hasPassengerInfo) {
                // Verify each passenger has a valid seatId
                boolean allPassengersHaveValidSeats = request.getPassengers().stream()
                        .allMatch(passenger -> 
                            passenger.getSeatId() != null && 
                            request.getSeatIds().contains(passenger.getSeatId()) &&
                            passenger.getFirstName() != null && !passenger.getFirstName().isEmpty() &&
                            passenger.getLastName() != null && !passenger.getLastName().isEmpty()
                        );
                
                if (!allPassengersHaveValidSeats) {
                    logger.error("Some passenger information is invalid");
                    return ResponseEntity.badRequest().body(Map.of(
                            "message", "All passengers must have valid seat assignments and names"
                    ));
                }
                
                // Create the booking with passenger information
                Booking booking = bookingService.createBookingWithPassengers(
                        userDetails.getUser(), 
                        flightId,
                        seats,
                        request.getPassengers()
                );
                
                return ResponseEntity.status(HttpStatus.CREATED)
                        .body(BookingDTO.fromBooking(booking));
            } else {
                // Create the booking without passenger information (legacy method)
                Booking booking = bookingService.createBookingWithSeats(
                        userDetails.getUser(), 
                        flightId,
                        seats
                );
                
                return ResponseEntity.status(HttpStatus.CREATED)
                        .body(BookingDTO.fromBooking(booking));
            }
            
        } catch (Exception e) {
            logger.error("Error creating booking", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to create booking: " + e.getMessage()));
        }
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<?> getBookingById(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        logger.info("Getting booking with ID: {} for user: {}", bookingId, userDetails.getId());
        
        return bookingService.getBookingById(bookingId)
                .filter(booking -> booking.getUser().getId().equals(userDetails.getId()))
                .map(booking -> ResponseEntity.ok(BookingDTO.fromBooking(booking)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{bookingId}/cancel")
    public ResponseEntity<?> cancelBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        logger.info("Received request to cancel booking with ID: {} for user ID: {}", bookingId, userDetails.getId());
        
        // Check if the booking exists first (separate check for better error handling)
        Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
        if (bookingOpt.isEmpty()) {
            logger.warn("Cancel booking failed: Booking with ID {} does not exist", bookingId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "message", "Booking not found",
                "bookingId", bookingId
            ));
        }
        
        // Check if the booking belongs to the user
        Booking booking = bookingOpt.get();
        if (!booking.getUser().getId().equals(userDetails.getId())) {
            logger.warn("Cancel booking failed: Booking {} belongs to user ID {}, not to requesting user ID {}", 
                    bookingId, booking.getUser().getId(), userDetails.getId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "message", "You do not have permission to cancel this booking",
                "bookingId", bookingId
            ));
        }
        
        // Check if the booking is already cancelled
        if (booking.getStatus() == BookingStatus.CANCELLED) {
            logger.warn("Cancel booking failed: Booking {} is already cancelled", bookingId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "message", "This booking is already cancelled",
                "bookingId", bookingId
            ));
        }
        
        // Attempt to cancel the booking
        try {
        boolean cancelled = bookingService.cancelBooking(bookingId, userDetails.getId());
        
        if (cancelled) {
                logger.info("Successfully cancelled booking {}", bookingId);
            return ResponseEntity.ok(Map.of(
                "message", "Booking cancelled successfully",
                "bookingId", bookingId
            ));
        } else {
                // This should rarely happen since we've already checked the main conditions
                logger.warn("Unexpected failure when cancelling booking {}", bookingId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Failed to cancel booking. The booking must be in CONFIRMED or PAID status to be cancelled.",
                    "bookingId", bookingId
                ));
            }
        } catch (Exception e) {
            logger.error("Exception occurred while cancelling booking {}: {}", bookingId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "An unexpected error occurred: " + e.getMessage(),
                "bookingId", bookingId
            ));
        }
    }

    // Add a new endpoint for simple filtering by status
    @GetMapping("/simple-filter")
    public ResponseEntity<?> getSimpleFilteredBookings(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long bookingId) {
        
        logger.info("Getting simple filtered bookings for user with ID: {}, status={}, bookingId={}", 
                userDetails.getId(), status, bookingId);
        
        try {
            // Get all user bookings
            List<Booking> bookings = bookingService.getUserBookings(userDetails.getUser());
            
            // Filter by bookingId if provided
            List<Booking> filteredBookings = bookings;
            if (bookingId != null) {
                filteredBookings = bookings.stream()
                        .filter(b -> b.getId().equals(bookingId))
                        .collect(Collectors.toList());
                
                if (filteredBookings.isEmpty()) {
                    logger.info("No booking found with ID: {}", bookingId);
                }
            }
            
            // Then apply status filter if provided
            if (status != null && !status.isEmpty() && !filteredBookings.isEmpty()) {
                try {
                    com.example.ticket_booking_backend.model.BookingStatus bookingStatus = 
                        com.example.ticket_booking_backend.model.BookingStatus.valueOf(status.toUpperCase());
                    filteredBookings = filteredBookings.stream()
                            .filter(b -> b.getStatus() == bookingStatus)
                            .collect(Collectors.toList());
                } catch (IllegalArgumentException e) {
                    logger.warn("Invalid booking status '{}' provided, ignoring filter", status);
                }
            }
            
            // Convert to DTOs
            List<BookingDTO> bookingDTOs = filteredBookings.stream()
                    .map(BookingDTO::fromBooking)
                    .collect(Collectors.toList());
            
            // Create response
            Map<String, Object> response = new HashMap<>();
            response.put("bookings", bookingDTOs);
            response.put("totalItems", bookingDTOs.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error fetching simple filtered bookings", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to fetch bookings: " + e.getMessage()));
        }
    }

    @GetMapping("/{bookingId}/download-ticket")
    public ResponseEntity<?> downloadTicket(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        logger.info("Downloading ticket for booking ID: {} requested by user: {}", bookingId, userDetails.getId());
        
        try {
            Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
            
            if (bookingOpt.isEmpty()) {
                logger.warn("Booking not found: {}", bookingId);
                return ResponseEntity.notFound().build();
            }
            
            Booking booking = bookingOpt.get();
            
            // Security check: ensure user owns this booking
            if (!booking.getUser().getId().equals(userDetails.getId())) {
                logger.warn("Unauthorized ticket download attempt for booking: {} by user: {}", 
                    bookingId, userDetails.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "You do not have permission to download this ticket"
                ));
            }
            
            // Check if booking is cancelled
            if (booking.getStatus() == BookingStatus.CANCELLED) {
                logger.warn("Download ticket attempt for cancelled booking: {}", bookingId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Cannot download ticket for a cancelled booking"
                ));
            }
            
            // Check if booking is pending (not paid)
            if (booking.getStatus() == BookingStatus.PENDING) {
                logger.warn("Download ticket attempt for pending/unpaid booking: {}", bookingId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Cannot download ticket for an unpaid booking"
                ));
            }
            
            // Check if the flight has already departed (or arrived)
            LocalDateTime now = LocalDateTime.now();
            if (booking.getFlight().getArrivalTime().isBefore(now)) {
                logger.warn("Download ticket attempt for past flight booking: {}", bookingId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Cannot download ticket for a past flight"
                ));
            }
            
            // Generate PDF - use the booking's user object to ensure we have the most up-to-date user info
            byte[] pdfContent = pdfTicketGenerator.generateTicket(booking, booking.getUser());
            
            // Set headers for PDF download
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "flight-ticket-" + bookingId + ".pdf");
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
            
            logger.info("Successfully generated ticket PDF for booking: {}", bookingId);
            
            return new ResponseEntity<>(pdfContent, headers, HttpStatus.OK);
            
        } catch (Exception e) {
            logger.error("Error generating ticket PDF for booking: " + bookingId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to generate ticket: " + e.getMessage()));
        }
    }
    
    @PostMapping("/{bookingId}/email-ticket")
    public ResponseEntity<?> emailTicket(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        logger.info("Emailing ticket for booking ID: {} requested by user: {}", bookingId, userDetails.getId());
        
        try {
            Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
            
            if (bookingOpt.isEmpty()) {
                logger.warn("Booking not found: {}", bookingId);
                return ResponseEntity.notFound().build();
            }
            
            Booking booking = bookingOpt.get();
            
            // Security check: ensure user owns this booking
            if (!booking.getUser().getId().equals(userDetails.getId())) {
                logger.warn("Unauthorized ticket email attempt for booking: {} by user: {}", 
                    bookingId, userDetails.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "message", "You do not have permission to email this ticket"
                ));
            }
            
            // Check if booking is cancelled
            if (booking.getStatus() == BookingStatus.CANCELLED) {
                logger.warn("Email ticket attempt for cancelled booking: {}", bookingId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Cannot email ticket for a cancelled booking"
                ));
            }
            
            // Check if booking is pending (not paid)
            if (booking.getStatus() == BookingStatus.PENDING) {
                logger.warn("Email ticket attempt for pending/unpaid booking: {}", bookingId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Cannot email ticket for an unpaid booking"
                ));
            }
            
            // Check if the flight has already departed (or arrived)
            LocalDateTime now = LocalDateTime.now();
            if (booking.getFlight().getArrivalTime().isBefore(now)) {
                logger.warn("Email ticket attempt for past flight booking: {}", bookingId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Cannot email ticket for a past flight"
                ));
            }
            
            // Generate PDF
            byte[] pdfContent = pdfTicketGenerator.generateTicket(booking, booking.getUser());
            
            // Use the user object from the booking to ensure we have the most up-to-date email
            emailService.sendTicketEmail(booking, booking.getUser(), pdfContent);
            
            logger.info("Successfully sent ticket email for booking: {}", bookingId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Ticket has been sent to your email"
            ));
            
        } catch (Exception e) {
            logger.error("Error sending ticket email for booking: " + bookingId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to send ticket email: " + e.getMessage()));
        }
    }

    @PutMapping("/{bookingId}/payment-failed")
    public ResponseEntity<?> handlePaymentFailure(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        logger.info("Handling payment failure for booking ID: {} by user: {}", 
                    bookingId, userDetails.getId());
        
        try {
            Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
            
            if (bookingOpt.isEmpty()) {
                logger.warn("Booking not found: {}", bookingId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", "Booking not found"
                ));
            }
            
            Booking booking = bookingOpt.get();
            
            // Security check: ensure user owns this booking
            if (!booking.getUser().getId().equals(userDetails.getId())) {
                logger.warn("Unauthorized attempt to cancel booking after payment failure: {} by user: {}", 
                    bookingId, userDetails.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "You do not have permission to modify this booking"
                ));
            }
            
            // Only PENDING bookings can be cancelled by payment failure
            if (booking.getStatus() != BookingStatus.PENDING) {
                logger.warn("Cannot cancel booking {} after payment failure: Booking is not in PENDING state", bookingId);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "message", "This booking cannot be cancelled as it's not in PENDING state"
                ));
            }
            
            try {
                // Update booking status to CANCELLED
                booking.setStatus(BookingStatus.CANCELLED);
                
                // First, delete all passenger records associated with this booking
                // This is needed to avoid constraint violations when a user tries to rebook the same seat
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
                
                bookingService.saveBooking(booking);
                logger.info("Updated booking {} status to CANCELLED due to payment failure", bookingId);
            } catch (Exception e) {
                logger.error("Error removing passengers or updating booking status: {}", e.getMessage(), e);
                // Continue with seat release even if passenger removal fails
            }
            
            // Release all seats associated with this booking
            for (Seat seat : booking.getSeats()) {
                try {
                    seat.setReserved(false);
                    seat.setBooked(false);
                    seat.setAvailable(true);
                    seatRepository.save(seat);
                    
                    // Notify WebSocket subscribers about seat update
                    webSocketService.notifySeatUpdate(
                        seat.getFlight().getId(),
                        seat.getId(),
                        true, // Is available
                        "RELEASED",
                        System.currentTimeMillis()
                    );
                } catch (Exception e) {
                    logger.error("Error releasing seat {}: {}", seat.getId(), e.getMessage(), e);
                    // Continue with other seats
                }
            }
            
            logger.info("Successfully cancelled booking {} after payment failure", bookingId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Booking cancelled due to payment failure"
            ));
            
        } catch (Exception e) {
            logger.error("Error cancelling booking after payment failure: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "An error occurred while processing payment failure: " + e.getMessage()
            ));
        }
    }
} 