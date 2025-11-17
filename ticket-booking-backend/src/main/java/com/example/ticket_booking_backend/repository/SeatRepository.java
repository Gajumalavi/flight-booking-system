package com.example.ticket_booking_backend.repository;

import com.example.ticket_booking_backend.model.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    List<Seat> findByFlightIdAndAvailableTrue(Long flightId);  // Changed method name

    List<Seat> findByFlightId(Long flightId);  // Add this method
    
    // Find seats with expired holds
    List<Seat> findByHoldUntilLessThan(LocalDateTime time);
    
    // Find seats with hold expiring soon
    List<Seat> findByHoldUntilBetween(LocalDateTime start, LocalDateTime end);

    // Find seats that are inconsistent (unavailable but not booked and no hold)
    List<Seat> findByAvailableFalseAndBookedFalseAndHoldUntilIsNull();

    @Modifying
    @Query("DELETE FROM Seat s WHERE s.flight.id = :flightId")
    void deleteByFlightId(@Param("flightId") Long flightId);
}