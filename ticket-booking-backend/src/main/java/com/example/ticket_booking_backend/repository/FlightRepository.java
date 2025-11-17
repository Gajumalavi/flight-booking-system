package com.example.ticket_booking_backend.repository;

import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.model.FlightStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FlightRepository extends JpaRepository<Flight, Long> {

    // ✅ Case-insensitive search for flights by origin, destination, and departure time range
    @Query("SELECT f FROM Flight f WHERE LOWER(f.origin) = LOWER(:origin) AND LOWER(f.destination) = LOWER(:destination) AND f.departureTime BETWEEN :startDateTime AND :endDateTime")
    List<Flight> searchFlightsIgnoreCase(
            @Param("origin") String origin,
            @Param("destination") String destination,
            @Param("startDateTime") LocalDateTime startDateTime,
            @Param("endDateTime") LocalDateTime endDateTime
    );

    // ✅ Find flights by exact origin and destination
    List<Flight> findByOriginAndDestination(String origin, String destination);

    // ✅ Find flights by origin, destination, and departure time range
    List<Flight> findByOriginAndDestinationAndDepartureTimeBetween(
            String origin,
            String destination,
            LocalDateTime startDateTime,
            LocalDateTime endDateTime
    );

    // ✅ Additional methods for future scalability:

    // Find flights by departure date only
    List<Flight> findByDepartureTimeBetween(LocalDateTime startDateTime, LocalDateTime endDateTime);

    // Find flights by origin only
    List<Flight> findByOrigin(String origin);

    // Find flights by destination only
    List<Flight> findByDestination(String destination);

    // Find flights by price range
    List<Flight> findByPriceBetween(double minPrice, double maxPrice);
    
    // ✅ Flight Status Scheduler methods:
    
    // Find flights that have departed but not yet arrived and are not already marked as in-flight
    List<Flight> findByDepartureTimeLessThanAndArrivalTimeGreaterThanAndStatusNot(
        LocalDateTime currentTime, 
        LocalDateTime currentTimeForArrival, 
        FlightStatus statusToExclude
    );
    
    // Find flights that should have arrived but are not marked as arrived yet
    List<Flight> findByArrivalTimeLessThanAndStatusNot(
        LocalDateTime currentTime, 
        FlightStatus statusToExclude
    );
    
    // Find scheduled flights that are past their departure time by a threshold
    List<Flight> findByStatusAndDepartureTimeLessThan(
        FlightStatus status,
        LocalDateTime departureThreshold
    );
}
