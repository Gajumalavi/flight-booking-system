package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.BookingStatus;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.repository.SeatRepository;
import com.example.ticket_booking_backend.security.CustomUserDetails;
import com.example.ticket_booking_backend.service.BookingService;
import com.example.ticket_booking_backend.service.EmailService;
import com.example.ticket_booking_backend.service.RazorpayService;
import com.example.ticket_booking_backend.service.WebSocketService;
import com.razorpay.RazorpayException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private static final Logger logger = LoggerFactory.getLogger(PaymentController.class);
    
    @Autowired
    private RazorpayService razorpayService;
    
    @Autowired
    private BookingService bookingService;
    
    @Autowired
    private WebSocketService webSocketService;
    
    @Autowired
    private SeatRepository seatRepository;
    
    @Autowired
    private EmailService emailService;
    
    @Value("${razorpay.api.key.id}")
    private String keyId;
    
    /**
     * Get Razorpay API key
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        Map<String, String> config = new HashMap<>();
        config.put("keyId", keyId);
        return ResponseEntity.ok(config);
    }
    
    /**
     * Endpoint to create a Razorpay order for a booking
     */
    @PostMapping("/create-order/{bookingId}")
    public ResponseEntity<?> createOrder(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        
        logger.info("Creating Razorpay order for booking ID: {}", bookingId);
        
        try {
            // Verify the booking exists and belongs to the user
            Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
            if (bookingOpt.isEmpty()) {
                logger.warn("Booking not found: {}", bookingId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "error", "Booking not found"
                ));
            }
            
            Booking booking = bookingOpt.get();
            if (!booking.getUser().getId().equals(userDetails.getId())) {
                logger.warn("Unauthorized access to booking: {} by user: {}", bookingId, userDetails.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "You do not have permission to access this booking"
                ));
            }
            
            // Create a Razorpay order
            Map<String, Object> orderResponse = razorpayService.createOrder(booking);
            
            return ResponseEntity.ok(orderResponse);
        } catch (RazorpayException e) {
            logger.error("Razorpay error creating order: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Payment service error: " + e.getMessage()
            ));
        } catch (Exception e) {
            logger.error("Error creating order: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "An unexpected error occurred"
            ));
        }
    }
    
    /**
     * Process payment success
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(
            @RequestParam("razorpay_order_id") String orderId,
            @RequestParam("razorpay_payment_id") String paymentId,
            @RequestParam("razorpay_signature") String signature,
            @RequestParam("booking_id") Long bookingId) {
        
        logger.info("Verifying payment for order: {} and booking: {}", orderId, bookingId);
        
        try {
            // Verify the payment signature
            boolean isValid = razorpayService.verifyPaymentSignature(orderId, paymentId, signature);
            
            if (isValid) {
                // Update booking status to PAID
                Optional<Booking> bookingOpt = bookingService.getBookingById(bookingId);
                
                if (bookingOpt.isPresent()) {
                    Booking booking = bookingOpt.get();
                    booking.setStatus(BookingStatus.PAID);
                    bookingService.saveBooking(booking);
                    
                    // Update seat status to BOOKED (from RESERVED)
                    for (Seat seat : booking.getSeats()) {
                        seat.setBooked(true);
                        seat.setAvailable(false);
                        seat.setReserved(false); // Clear reservation
                        seatRepository.save(seat);
                        
                        // Notify seat status update via WebSocket
                        webSocketService.notifySeatUpdate(
                            booking.getFlight().getId(),
                            seat.getId(),
                            false,
                            "CONFIRMED",
                            System.currentTimeMillis()
                        );
                    }
                    
                    // Send confirmation email asynchronously without blocking the response
                    // This uses a separate thread pool to process the email
                    CompletableFuture.runAsync(() -> {
                        try {
                            logger.info("Sending booking confirmation email for paid booking ID: {}", booking.getId());
                            
                            // Get fully initialized booking to avoid LazyInitializationException
                            Optional<Booking> emailReadyBookingOpt = bookingService.getBookingWithDetailsForEmail(booking.getId());
                            if (emailReadyBookingOpt.isPresent()) {
                                emailService.sendBookingConfirmationEmail(emailReadyBookingOpt.get(), booking.getUser());
                                logger.info("Successfully sent booking confirmation email for booking ID: {}", booking.getId());
                            } else {
                                logger.error("Unable to fetch booking details for email: booking ID {}", booking.getId());
                            }
                        } catch (Exception e) {
                            logger.error("Failed to send booking confirmation email: {}", e.getMessage(), e);
                            // Don't rethrow - we don't want email failures to break the payment process
                        }
                    });
                }
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Payment successful"
                ));
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "message", "Payment signature verification failed"
                ));
            }
        } catch (Exception e) {
            logger.error("Error processing payment verification: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "An unexpected error occurred"
            ));
        }
    }
    
    /**
     * Webhook endpoint for Razorpay events
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleRazorpayWebhook(@RequestBody String payload) {
        logger.info("Received Razorpay webhook");
        
        // Process the webhook data
        // This is a simplified implementation
        // Ideally, you would verify the webhook signature and process different event types
        
        return ResponseEntity.ok().build();
    }
} 