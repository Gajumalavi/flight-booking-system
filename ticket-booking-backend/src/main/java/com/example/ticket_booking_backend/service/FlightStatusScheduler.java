package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.model.FlightStatus;
import com.example.ticket_booking_backend.repository.FlightRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Service responsible for automatically updating flight statuses based on flight times
 */
@Service
public class FlightStatusScheduler {
    private static final Logger logger = LoggerFactory.getLogger(FlightStatusScheduler.class);

    private final FlightRepository flightRepository;
    private final WebSocketService webSocketService;

    @Autowired
    public FlightStatusScheduler(FlightRepository flightRepository, WebSocketService webSocketService) {
        this.flightRepository = flightRepository;
        this.webSocketService = webSocketService;
    }

    /**
     * Updates flight statuses automatically every minute
     * - SCHEDULED: Default status
     * - IN_FLIGHT: When current time is after departure time but before arrival time
     * - ARRIVED: When current time is after arrival time
     */
    @Scheduled(fixedRate = 60000) // Run every minute
    @Transactional
    public void updateFlightStatuses() {
        logger.info("Running scheduled flight status update task");
        LocalDateTime now = LocalDateTime.now();
        
        // Update flights that should be in-flight (after departure but before arrival)
        updateFlightsToInFlight(now);
        
        // Update flights that should have arrived
        updateFlightsToArrived(now);
        
        // Handle delayed flights if needed (could be based on business rules)
        handleDelayedFlights(now);
    }
    
    private void updateFlightsToInFlight(LocalDateTime now) {
        // Find flights that should be in-flight (departed but not arrived)
        List<Flight> departedFlights = flightRepository.findByDepartureTimeLessThanAndArrivalTimeGreaterThanAndStatusNot(
                now, now, FlightStatus.IN_FLIGHT);
        
        if (!departedFlights.isEmpty()) {
            logger.info("Updating {} flights to IN_FLIGHT status", departedFlights.size());
            
            for (Flight flight : departedFlights) {
                // Skip cancelled flights
                if (flight.getStatus() == FlightStatus.CANCELLED) {
                    continue;
                }
                
                flight.setStatus(FlightStatus.IN_FLIGHT);
                flightRepository.save(flight);
                
                // Notify via WebSocket that the flight status has changed
                webSocketService.notifyFlightUpdate(flight.getId(), 
                        Map.of("status", FlightStatus.IN_FLIGHT.name(), 
                               "flightId", flight.getId(),
                               "message", "Flight has departed and is now in air",
                               "timestamp", System.currentTimeMillis()));
                
                logger.info("Updated flight {} to IN_FLIGHT status", flight.getId());
            }
        }
    }
    
    private void updateFlightsToArrived(LocalDateTime now) {
        // Find flights that should have arrived
        List<Flight> arrivedFlights = flightRepository.findByArrivalTimeLessThanAndStatusNot(
                now, FlightStatus.ARRIVED);
        
        if (!arrivedFlights.isEmpty()) {
            logger.info("Updating {} flights to ARRIVED status", arrivedFlights.size());
            
            for (Flight flight : arrivedFlights) {
                // Skip cancelled flights
                if (flight.getStatus() == FlightStatus.CANCELLED) {
                    continue;
                }
                
                flight.setStatus(FlightStatus.ARRIVED);
                flightRepository.save(flight);
                
                // Notify via WebSocket that the flight status has changed
                webSocketService.notifyFlightUpdate(flight.getId(), 
                        Map.of("status", FlightStatus.ARRIVED.name(), 
                               "flightId", flight.getId(),
                               "message", "Flight has arrived at destination",
                               "timestamp", System.currentTimeMillis()));
                
                logger.info("Updated flight {} to ARRIVED status", flight.getId());
            }
        }
    }
    
    private void handleDelayedFlights(LocalDateTime now) {
        // This method could implement business logic for automatically detecting and marking flights as delayed
        // For example, flights that are still SCHEDULED but past their departure time by more than 15 minutes
        
        List<Flight> potentiallyDelayedFlights = flightRepository.findByStatusAndDepartureTimeLessThan(
                FlightStatus.SCHEDULED, now.minusMinutes(15));
        
        if (!potentiallyDelayedFlights.isEmpty()) {
            logger.info("Found {} flights that may need DELAYED status", potentiallyDelayedFlights.size());
            
            for (Flight flight : potentiallyDelayedFlights) {
                // Apply delay logic - could be based on various business rules
                long minutesLate = ChronoUnit.MINUTES.between(flight.getDepartureTime(), now);
                
                flight.setStatus(FlightStatus.DELAYED);
                flightRepository.save(flight);
                
                // Notify via WebSocket about the delay
                webSocketService.notifyFlightUpdate(flight.getId(), 
                        Map.of("status", FlightStatus.DELAYED.name(), 
                               "flightId", flight.getId(),
                               "message", "Flight has been delayed by " + minutesLate + " minutes",
                               "timestamp", System.currentTimeMillis()));
                
                logger.info("Updated flight {} to DELAYED status (delayed by {} minutes)", 
                        flight.getId(), minutesLate);
            }
        }
    }
} 