package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.service.PasswordResetService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth/password-reset")
@CrossOrigin(origins = "http://localhost:3000")
public class PasswordResetController {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetController.class);
    private final PasswordResetService passwordResetService;

    @Autowired
    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    /**
     * Initiates password reset process by sending OTP to email
     */
    @PostMapping("/request")
    public ResponseEntity<?> requestPasswordReset(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Email is required"
            ));
        }
        
        logger.info("Password reset requested for email: {}", email);
        boolean sent = passwordResetService.initiatePasswordReset(email);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        
        // Always return success to prevent email enumeration attacks
        // Even if the email doesn't exist in our system, we don't want to reveal that
        if (sent) {
            response.put("message", "If your email is registered with us, you will receive an OTP");
        } else {
            response.put("message", "If your email is registered with us, you will receive an OTP");
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Validates OTP and resets password
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtpAndResetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");
        
        // Validate input
        if (email == null || email.isEmpty() || 
            otp == null || otp.isEmpty() || 
            newPassword == null || newPassword.isEmpty()) {
            
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Email, OTP, and new password are required"
            ));
        }
        
        // Validate password strength
        if (newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Password must be at least 8 characters long"
            ));
        }
        
        logger.info("Verifying OTP for email: {}", email);
        boolean reset = passwordResetService.validateOtpAndResetPassword(email, otp, newPassword);
        
        if (reset) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Password has been reset successfully"
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Invalid or expired OTP. Please try again."
            ));
        }
    }
} 