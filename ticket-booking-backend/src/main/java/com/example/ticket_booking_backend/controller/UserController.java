package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);
    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName(); // Get logged-in user's email

        Optional<User> user = userRepository.findByEmail(email);

        if (user.isPresent()) {
            return ResponseEntity.ok(user.get()); // ✅ Return the correct user object
        } else {
            return ResponseEntity.status(404).body("User not found");
        }
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateUserProfile(@RequestBody User updatedUser) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String currentEmail = authentication.getName(); // Get logged-in user's email
        
        logger.info("Updating profile for user with email: {}", currentEmail);

        Optional<User> existingUser = userRepository.findByEmail(currentEmail);

        if (existingUser.isPresent()) {
            User user = existingUser.get();
            
            // Check if email is being updated
            if (updatedUser.getEmail() != null && !updatedUser.getEmail().equals(currentEmail)) {
                // Validate that the new email isn't already in use
                if (userRepository.findByEmail(updatedUser.getEmail()).isPresent()) {
                    logger.warn("Email update rejected - email already in use: {}", updatedUser.getEmail());
                    Map<String, String> response = new HashMap<>();
                    response.put("message", "Email already in use by another account");
                    return ResponseEntity.badRequest().body(response);
                }
                
                logger.info("Updating email from {} to {}", currentEmail, updatedUser.getEmail());
                user.setEmail(updatedUser.getEmail());
            }

            // Update other fields
            if (updatedUser.getFirstName() != null) user.setFirstName(updatedUser.getFirstName());
            if (updatedUser.getLastName() != null) user.setLastName(updatedUser.getLastName());
            if (updatedUser.getPhone() != null) user.setPhone(updatedUser.getPhone());
            if (updatedUser.getAddress() != null) user.setAddress(updatedUser.getAddress());

            userRepository.save(user); // ✅ Save updated user
            logger.info("User profile updated successfully");
            return ResponseEntity.ok(user);
        } else {
            logger.warn("User not found for email: {}", currentEmail);
            return ResponseEntity.status(404).body("User not found");
        }
    }
}
