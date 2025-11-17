package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.model.Role;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.repository.FlightRepository;
import com.example.ticket_booking_backend.repository.SeatRepository;
import com.example.ticket_booking_backend.repository.UserRepository;
import com.example.ticket_booking_backend.service.FlightService;
import com.example.ticket_booking_backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.HashMap;

@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "http://localhost:3000")
public class TestController {

   // @Autowired
   // private JdbcTemplate jdbcTemplate;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private UserRepository userRepository;

    private final FlightService flightService;

    @Autowired
    private EmailService emailService;

    private static final Logger logger = LoggerFactory.getLogger(TestController.class);

    public TestController(FlightService flightService) {
        this.flightService = flightService;
    }

    @PostMapping("/initialize-flights")
    public ResponseEntity<String> initializeTestFlights() {
        try {
            // Create sample flights
            Flight flight1 = new Flight();
            flight1.setFlightNumber("IX101");
            flight1.setOrigin("Delhi");
            flight1.setDestination("Mumbai");
            flight1.setDepartureTime(LocalDateTime.now().plusDays(1));
            flight1.setArrivalTime(LocalDateTime.now().plusDays(1).plusHours(2));
            flight1.setPrice(5000.00);

            Flight flight2 = new Flight();
            flight2.setFlightNumber("IX102");
            flight2.setOrigin("Mumbai");
            flight2.setDestination("Bangalore");
            flight2.setDepartureTime(LocalDateTime.now().plusDays(2));
            flight2.setArrivalTime(LocalDateTime.now().plusDays(2).plusHours(1));
            flight2.setPrice(4500.00);

            flightService.saveFlight(flight1);
            flightService.saveFlight(flight2);

            return ResponseEntity.ok("Test flights initialized successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error initializing flights: " + e.getMessage());
        }
    }

    @GetMapping("/seats/{flightId}")
    public ResponseEntity<?> getSeatsForFlight(@PathVariable Long flightId) {
        try {
            List<Seat> seats = seatRepository.findByFlightId(flightId);
            if (seats.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(seats);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching seats: " + e.getMessage());
        }
    }

    @PostMapping("/initialize-seats")
    @Transactional
    public ResponseEntity<?> initializeTestSeats(@RequestParam Long flightId) {
        try {
            Flight flight = flightRepository.findById(flightId)
                    .orElseThrow(() -> new RuntimeException("Flight not found with id: " + flightId));

            // Delete existing seats for this flight
            seatRepository.deleteByFlightId(flightId);

            List<Seat> seats = new ArrayList<>();
            // Create test seats (A1-F10)
            for (char row = 'A'; row <= 'F'; row++) {
                for (int number = 1; number <= 10; number++) {
                    Seat seat = new Seat();
                    seat.setSeatNumber(row + String.valueOf(number));
                    seat.setAvailable(true);
                    seat.setFlight(flight);
                    seats.add(seat);
                }
            }

            List<Seat> savedSeats = seatRepository.saveAll(seats);
            return ResponseEntity.ok("Successfully initialized " + savedSeats.size() + " seats for flight " + flightId);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/check-admin")
    public ResponseEntity<?> checkAdminUser() {
        try {
            List<User> users = userRepository.findAll();
            boolean hasAdmin = users.stream()
                .anyMatch(user -> user.getRole() == Role.ADMIN);
            
            StringBuilder response = new StringBuilder();
            response.append("Total users: ").append(users.size()).append("\n");
            
            if (hasAdmin) {
                response.append("Admin users found: \n");
                users.stream()
                    .filter(user -> user.getRole() == Role.ADMIN)
                    .forEach(admin -> {
                        response.append("- Email: ").append(admin.getEmail())
                               .append(", Role: ").append(admin.getRole())
                               .append("\n");
                    });
            } else {
                response.append("No admin users found. Creating a default admin user.\n");
                
                // Create a default admin user if none exists
                User adminUser = new User();
                adminUser.setEmail("admin@example.com");
                adminUser.setPassword(new BCryptPasswordEncoder().encode("admin123"));
                adminUser.setRole(Role.ADMIN);
                adminUser.setFirstName("System");
                adminUser.setLastName("Administrator");
                userRepository.save(adminUser);
                
                response.append("Created admin user: admin@example.com with password: admin123");
            }
            
            return ResponseEntity.ok(response.toString());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

   /* @GetMapping("/api/db-test")
    public String testDatabase() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return "Database connection successful!";
        } catch (Exception e) {
            return "Database connection failed: " + e.getMessage();
        }
    }

    @GetMapping("/api/test")
    public String testEndpoint() {
        return "Backend is running!";
    }

    @GetMapping("/api/health")
    public String healthCheck() {
        return "OK";
    }*/

    /**
     * Test endpoint to verify email functionality
     * This endpoint allows you to test if your email configuration is working properly
     * 
     * @param to Email address to send the test email to
     * @return Success or failure message
     */
    @GetMapping("/email")
    public ResponseEntity<?> testEmail(@RequestParam String to) {
        logger.info("Testing SendGrid email functionality by sending to: {}", to);
        try {
            String subject = "Flight Booking System - SendGrid Test Email";
            String content = "This is a test email from your Flight Booking System sent via SendGrid.<br><br>"
                + "If you received this, your SendGrid configuration is working correctly!<br><br>"
                + "Your system is now configured to send:<br>"
                + "- Booking confirmations<br>"
                + "- Ticket downloads<br>"
                + "- Booking cancellations<br><br>"
                + "Note: SendGrid's free tier allows 100 emails per day.<br><br>"
                + "Time of test: " + java.time.LocalDateTime.now();
            emailService.sendBookingConfirmationEmailDirect(to, subject, content);
            logger.info("SendGrid test email sent successfully to: {}", to);
            Map<String, String> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "SendGrid test email sent successfully to " + to);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to send SendGrid test email: ", e);
            String errorDetails = e.getMessage();
            if (e.getCause() != null) {
                errorDetails += " | Cause: " + e.getCause().getMessage();
            }
            Map<String, Object> response = new HashMap<>();
            response.put("status", "error");
            response.put("message", "Failed to send test email: " + errorDetails);
            response.put("error", e.getClass().getName());
            if (errorDetails.contains("535 Authentication failed") || errorDetails.contains("535-5.7.8")) {
                response.put("hint", "Your SendGrid API key appears to be invalid. Please check your configuration.");
            } else if (errorDetails.contains("sender address rejected")) {
                response.put("hint", "Your sender email is not verified with SendGrid. Please verify it in your SendGrid account.");
            }
            return ResponseEntity.internalServerError().body(response);
        }
    }
}