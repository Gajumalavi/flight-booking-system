package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.PasswordResetRequest;
import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.repository.PasswordResetRepository;
import com.example.ticket_booking_backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class PasswordResetService {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final long OTP_RATE_LIMIT_MINUTES = 2; // Minimum time between OTP requests

    private final UserRepository userRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetRepository passwordResetRepository,
            EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordResetRepository = passwordResetRepository;
        this.emailService = emailService;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    /**
     * Initiates a password reset by generating an OTP and sending it via email
     * @param email User's email address
     * @return true if OTP was sent, false if user doesn't exist
     */
    public boolean initiatePasswordReset(String email) {
        // Check if user exists
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            logger.warn("Password reset attempted for non-existent email: {}", email);
            return false;
        }

        // Check rate limiting
        Optional<PasswordResetRequest> lastRequestOpt = passwordResetRepository.findTopByEmailOrderByExpiryTimeDesc(email);
        if (lastRequestOpt.isPresent()) {
            PasswordResetRequest lastRequest = lastRequestOpt.get();
            LocalDateTime rateLimitTime = LocalDateTime.now().minusMinutes(OTP_RATE_LIMIT_MINUTES);
            
            if (lastRequest.getExpiryTime().isAfter(rateLimitTime)) {
                logger.warn("Password reset rate limited for email: {}", email);
                return false;
            }
        }

        // Generate OTP
        String otp = generateOtp(OTP_LENGTH);
        
        // Save OTP in database
        PasswordResetRequest resetRequest = new PasswordResetRequest(
            email,
            otp,
            LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES)
        );
        passwordResetRepository.save(resetRequest);
        
        // Send OTP via email
        emailService.sendPasswordResetOtpEmail(email, otp);
        
        logger.info("Password reset initiated for email: {}", email);
        return true;
    }

    /**
     * Validates OTP and resets the password if valid
     * @param email User's email
     * @param otp OTP entered by user
     * @param newPassword New password
     * @return true if password was reset successfully, false otherwise
     */
    public boolean validateOtpAndResetPassword(String email, String otp, String newPassword) {
        // Find active OTP for this email
        Optional<PasswordResetRequest> resetRequestOpt = 
            passwordResetRepository.findByEmailAndOtpAndUsedFalse(email, otp);
        
        if (resetRequestOpt.isEmpty()) {
            logger.warn("Invalid OTP attempted for email: {}", email);
            return false;
        }
        
        PasswordResetRequest resetRequest = resetRequestOpt.get();
        
        // Check if OTP is expired
        if (resetRequest.isExpired()) {
            logger.warn("Expired OTP attempted for email: {}", email);
            return false;
        }
        
        // Find user
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            logger.error("User not found during password reset for email: {}", email);
            return false;
        }
        
        User user = userOpt.get();
        
        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        // Mark OTP as used
        resetRequest.setUsed(true);
        passwordResetRepository.save(resetRequest);
        
        // Send password change confirmation email
        emailService.sendPasswordChangeConfirmationEmail(email);
        
        logger.info("Password reset successfully for email: {}", email);
        return true;
    }

    /**
     * Generates a random numeric OTP of specified length
     * @param length Length of OTP
     * @return OTP string
     */
    private String generateOtp(int length) {
        SecureRandom random = new SecureRandom();
        StringBuilder otp = new StringBuilder();
        
        for (int i = 0; i < length; i++) {
            otp.append(random.nextInt(10)); // Append a random digit (0-9)
        }
        
        return otp.toString();
    }
} 