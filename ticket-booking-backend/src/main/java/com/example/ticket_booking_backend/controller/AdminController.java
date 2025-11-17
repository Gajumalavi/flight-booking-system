package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.model.Role;
import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.repository.UserRepository;
import com.example.ticket_booking_backend.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "http://localhost:3000")
public class AdminController {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public AdminController(UserRepository userRepository, BookingRepository bookingRepository) {
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        Optional<User> user = userRepository.findById(id);
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> userData) {
        // Check if email already exists
        if (userRepository.findByEmail(userData.get("email")).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        User newUser = new User();
        newUser.setEmail(userData.get("email"));
        
        // Set password with encoding
        String hashedPassword = passwordEncoder.encode(userData.get("password"));
        newUser.setPassword(hashedPassword);
        
        // Set role
        try {
            Role role = Role.valueOf(userData.get("role"));
            newUser.setRole(role);
        } catch (IllegalArgumentException e) {
            newUser.setRole(Role.CUSTOMER); // Default role
        }

        // Set optional fields
        if (userData.containsKey("firstName")) {
            newUser.setFirstName(userData.get("firstName"));
        }
        if (userData.containsKey("lastName")) {
            newUser.setLastName(userData.get("lastName"));
        }
        if (userData.containsKey("phone")) {
            newUser.setPhone(userData.get("phone"));
        }
        if (userData.containsKey("address")) {
            newUser.setAddress(userData.get("address"));
        }

        User savedUser = userRepository.save(newUser);
        return ResponseEntity.ok(savedUser);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> userData) {
        Optional<User> existingUser = userRepository.findById(id);
        
        if (!existingUser.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = existingUser.get();
        
        // Update fields if provided
        if (userData.containsKey("email")) {
            // Check if email already exists for another user
            Optional<User> userWithEmail = userRepository.findByEmail(userData.get("email"));
            if (userWithEmail.isPresent() && !userWithEmail.get().getId().equals(id)) {
                return ResponseEntity.badRequest().body("Email already exists");
            }
            user.setEmail(userData.get("email"));
        }
        
        if (userData.containsKey("password")) {
            String hashedPassword = passwordEncoder.encode(userData.get("password"));
            user.setPassword(hashedPassword);
        }
        
        if (userData.containsKey("role")) {
            try {
                Role role = Role.valueOf(userData.get("role"));
                user.setRole(role);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body("Invalid role");
            }
        }
        
        if (userData.containsKey("firstName")) {
            user.setFirstName(userData.get("firstName"));
        }
        
        if (userData.containsKey("lastName")) {
            user.setLastName(userData.get("lastName"));
        }
        
        if (userData.containsKey("phone")) {
            user.setPhone(userData.get("phone"));
        }
        
        if (userData.containsKey("address")) {
            user.setAddress(userData.get("address"));
        }
        
        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        try {
            // Get the user
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            User user = userOpt.get();
            
            // Delete associated bookings first
            try {
                // Find all bookings associated with the user
                List<Booking> userBookings = bookingRepository.findByUser(user);
                
                if (!userBookings.isEmpty()) {
                    for (Booking booking : userBookings) {
                        // For each booking, delete it which will cascade to passengers, etc.
                        bookingRepository.delete(booking);
                    }
                }
                
                // Now that bookings are removed, it's safe to delete the user
                userRepository.delete(user);
                
                return ResponseEntity.ok().body(Map.of(
                    "message", "User and all associated bookings deleted successfully",
                    "bookingsDeleted", userBookings.size()
                ));
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                        "error", "Failed to delete user",
                        "message", e.getMessage(),
                        "details", "Unable to delete associated bookings - you must manually delete them first"
                    ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "error", "Failed to delete user",
                    "message", e.getMessage()
                ));
        }
    }
} 