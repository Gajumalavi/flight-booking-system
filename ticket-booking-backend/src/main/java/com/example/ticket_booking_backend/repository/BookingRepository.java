package com.example.ticket_booking_backend.repository;

import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.BookingStatus;
import com.example.ticket_booking_backend.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    // Basic query for all user bookings
    List<Booking> findByUser(User user);
    
    // Paginated query for user bookings
    Page<Booking> findByUser(User user, Pageable pageable);
    
    // Filter by status
    Page<Booking> findByUserAndStatus(User user, BookingStatus status, Pageable pageable);
    
    // Filter by flight ID
    Page<Booking> findByUserAndFlightId(User user, Long flightId, Pageable pageable);
    
    // Combined filters with status and flight ID
    Page<Booking> findByUserAndStatusAndFlightId(User user, BookingStatus status, Long flightId, Pageable pageable);
    
    // Filter by booking date range
    Page<Booking> findByUserAndBookingTimeBetween(
            User user, 
            LocalDateTime startDate, 
            LocalDateTime endDate, 
            Pageable pageable
    );
    
    // Combined filters with status and date range
    Page<Booking> findByUserAndStatusAndBookingTimeBetween(
            User user,
            BookingStatus status,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Pageable pageable
    );
    
    // Filter by flight departure date range
    @Query("SELECT b FROM Booking b JOIN b.flight f WHERE b.user = :user " +
           "AND f.departureTime >= :startDate AND f.departureTime <= :endDate")
    Page<Booking> findByUserAndFlightDepartureTimeBetween(
            @Param("user") User user,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );
    
    // Combined filters with status and flight departure date range
    @Query("SELECT b FROM Booking b JOIN b.flight f WHERE b.user = :user " +
           "AND b.status = :status " +
           "AND f.departureTime >= :startDate AND f.departureTime <= :endDate")
    Page<Booking> findByUserAndStatusAndFlightDepartureTimeBetween(
            @Param("user") User user,
            @Param("status") BookingStatus status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );
    
    // Advanced query with all filters
    @Query("SELECT b FROM Booking b WHERE b.user = :user " +
           "AND (:status IS NULL OR b.status = :status) " +
           "AND (:flightId IS NULL OR b.flight.id = :flightId) " +
           "AND (:startDate IS NULL OR b.bookingTime >= :startDate) " +
           "AND (:endDate IS NULL OR b.bookingTime <= :endDate)")
    Page<Booking> findBookingsWithFilters(
            @Param("user") User user,
            @Param("status") BookingStatus status,
            @Param("flightId") Long flightId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );
    
    // Find bookings by status and created before a specific time (for auto-cancellation)
    List<Booking> findByStatusAndBookingTimeBefore(BookingStatus status, LocalDateTime time);

    List<Booking> findByBookingTimeBetween(LocalDateTime start, LocalDateTime end);
}
