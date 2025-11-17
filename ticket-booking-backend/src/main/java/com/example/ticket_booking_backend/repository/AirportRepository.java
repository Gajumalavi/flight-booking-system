package com.example.ticket_booking_backend.repository;

import com.example.ticket_booking_backend.model.Airport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AirportRepository extends JpaRepository<Airport, Long> {
    Optional<Airport> findByCode(String code);
    
    @Query("SELECT a FROM Airport a WHERE " +
           "LOWER(a.code) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.city) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.state) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.country) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Airport> searchAirports(@Param("query") String query);
} 