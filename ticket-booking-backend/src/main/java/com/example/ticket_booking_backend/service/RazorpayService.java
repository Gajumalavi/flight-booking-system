package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.Booking;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;

import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;

@Service
public class RazorpayService {

    private static final Logger logger = LoggerFactory.getLogger(RazorpayService.class);

    @Value("${razorpay.api.key.id}")
    private String keyId;

    @Value("${razorpay.api.key.secret}")
    private String keySecret;

    @Value("${razorpay.success.url}")
    private String successUrl;

    @Value("${razorpay.cancel.url}")
    private String cancelUrl;
    
    private RazorpayClient razorpayClient;

    @PostConstruct
    public void init() {
        try {
            razorpayClient = new RazorpayClient(keyId, keySecret);
            logger.info("Razorpay initialized with API key");
        } catch (RazorpayException e) {
            logger.error("Error initializing Razorpay client", e);
        }
    }

    /**
     * Create an order for the given booking
     * 
     * @param booking The booking to create an order for
     * @return The created order details
     * @throws RazorpayException If an error occurs with Razorpay
     */
    public Map<String, Object> createOrder(Booking booking) throws RazorpayException {
        // Calculate the total price (in paise as Razorpay requires - 100 paise = 1 INR)
        long totalPriceInPaise = calculateBookingPriceInPaise(booking);
        
        // Create order options
        JSONObject orderOptions = new JSONObject();
        orderOptions.put("amount", totalPriceInPaise);
        orderOptions.put("currency", "INR");
        orderOptions.put("receipt", "booking_" + booking.getId());
        orderOptions.put("payment_capture", 1); // Auto capture payment
        
        // Create notes for reference
        JSONObject notes = new JSONObject();
        notes.put("booking_id", booking.getId().toString());
        notes.put("customer_email", booking.getUser().getEmail());
        orderOptions.put("notes", notes);
        
        // Create the order
        Order order = razorpayClient.orders.create(orderOptions);
        logger.info("Created Razorpay order {} for booking {}", order.get("id"), booking.getId());
        
        // Create response with order details and configuration
        Map<String, Object> response = new HashMap<>();
        response.put("orderId", order.get("id"));
        response.put("amount", totalPriceInPaise);
        response.put("currency", "INR");
        response.put("keyId", keyId);
        response.put("bookingId", booking.getId());
        response.put("prefill", createPrefillData(booking));
        response.put("notes", createNotesData(booking));
        
        return response;
    }
    
    /**
     * Verify payment signature to validate payment
     * 
     * @param orderId The Razorpay order ID
     * @param paymentId The Razorpay payment ID
     * @param signature The signature received from Razorpay
     * @return true if the signature is valid
     */
    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        try {
            // Create a signature verification data JSON
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", orderId);
            options.put("razorpay_payment_id", paymentId);
            options.put("razorpay_signature", signature);
            
            // Verify the signature
            boolean isSignatureValid = Utils.verifyPaymentSignature(options, keySecret);
            logger.info("Payment signature verification result: {}", isSignatureValid);
            return isSignatureValid;
        } catch (RazorpayException e) {
            logger.error("Error verifying payment signature: {}", e.getMessage(), e);
            return false;
        }
    }
    
    /**
     * Calculate the total price of the booking in paise for Razorpay
     * 
     * @param booking The booking to calculate the price for
     * @return The total price in paise (100 paise = 1 INR)
     */
    private long calculateBookingPriceInPaise(Booking booking) {
        // Get base price from the flight
        double basePrice = booking.getFlight().getPrice();
        
        // Calculate total for all seats
        int numSeats = booking.getSeats().size();
        double totalPrice = basePrice * numSeats;
        
        // Convert to paise (Razorpay requires integer amount in smallest currency unit)
        return Math.round(totalPrice * 100);
    }
    
    /**
     * Create prefill data for Razorpay checkout
     * 
     * @param booking The booking to create prefill data for
     * @return Prefill data map
     */
    private Map<String, String> createPrefillData(Booking booking) {
        Map<String, String> prefill = new HashMap<>();
        prefill.put("email", booking.getUser().getEmail());
        
        // Add name and phone if available
        if (booking.getUser().getFirstName() != null && booking.getUser().getLastName() != null) {
            prefill.put("name", booking.getUser().getFirstName() + " " + booking.getUser().getLastName());
        }
        
        if (booking.getUser().getPhone() != null) {
            prefill.put("contact", booking.getUser().getPhone());
        }
        
        return prefill;
    }
    
    /**
     * Create notes data for Razorpay checkout
     * 
     * @param booking The booking to create notes for
     * @return Notes data map
     */
    private Map<String, String> createNotesData(Booking booking) {
        Map<String, String> notes = new HashMap<>();
        notes.put("booking_id", booking.getId().toString());
        notes.put("flight_number", booking.getFlight().getFlightNumber());
        notes.put("origin", booking.getFlight().getOrigin());
        notes.put("destination", booking.getFlight().getDestination());
        return notes;
    }
} 