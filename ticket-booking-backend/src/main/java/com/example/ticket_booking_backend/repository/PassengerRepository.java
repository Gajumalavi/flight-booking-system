package com.example.ticket_booking_backend.repository;

import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.Passenger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PassengerRepository extends JpaRepository<Passenger, Long> {
    List<Passenger> findByBooking(Booking booking);
    List<Passenger> findByBookingId(Long bookingId);
} 