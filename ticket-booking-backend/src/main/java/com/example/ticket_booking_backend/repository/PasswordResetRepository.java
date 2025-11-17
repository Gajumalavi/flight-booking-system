package com.example.ticket_booking_backend.repository;

import com.example.ticket_booking_backend.model.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetRepository extends JpaRepository<PasswordResetRequest, Long> {
    Optional<PasswordResetRequest> findByEmailAndOtpAndUsedFalse(String email, String otp);
    Optional<PasswordResetRequest> findTopByEmailOrderByExpiryTimeDesc(String email);
} 