package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.config.ApiQuotaConfig;
import com.example.ticket_booking_backend.config.AppFeatureConfig;
import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.service.FlightService;
import com.example.ticket_booking_backend.repository.FlightRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/flights")
@CrossOrigin(origins = "http://localhost:3000")
public class FlightController {

    private static final Logger logger = LoggerFactory.getLogger(FlightController.class);
    private final FlightService flightService;
    private final AppFeatureConfig appFeatureConfig;
    private final ApiQuotaConfig apiQuotaConfig;
    private final FlightRepository flightRepository;

    @Autowired
    public FlightController(FlightService flightService, 
                            AppFeatureConfig appFeatureConfig,
                            ApiQuotaConfig apiQuotaConfig,
                            FlightRepository flightRepository) {
        this.flightService = flightService;
        this.appFeatureConfig = appFeatureConfig;
        this.apiQuotaConfig = apiQuotaConfig;
        this.flightRepository = flightRepository;
    }

    @GetMapping
    public ResponseEntity<List<Flight>> getAllFlights() {
        try {
            logger.info("Fetching all flights");
            List<Flight> flights = flightService.getAllFlights();
            
            // Filter out flights with departure times in the past
            LocalDateTime now = LocalDateTime.now();
            List<Flight> futureFlights = flights.stream()
                .filter(flight -> flight.getDepartureTime().isAfter(now))
                .collect(Collectors.toList());
            
            logger.info("Filtered to {} future flights out of {} total flights", futureFlights.size(), flights.size());
            return ResponseEntity.ok(futureFlights);
        } catch (Exception e) {
            logger.error("Error fetching all flights: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Admin endpoint to get all flights including past flights
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Flight>> getAllFlightsAdmin() {
        try {
            logger.info("Admin fetching all flights including past flights");
            List<Flight> flights = flightService.getAllFlights();
            return ResponseEntity.ok(flights);
        } catch (Exception e) {
            logger.error("Error fetching all flights for admin: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchFlights(
            @RequestParam String origin,
            @RequestParam String destination,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate departureDate
    ) {
        try {
            logger.info("Searching flights from {} to {} on {}", origin, destination, departureDate);
            
            // Validate departure date is not in the past
            LocalDate today = LocalDate.now();
            if (departureDate.isBefore(today)) {
                logger.warn("Attempt to search flights for past date: {}", departureDate);
                return ResponseEntity.badRequest()
                    .body("Cannot search for flights in the past. Today is " + today);
            }

            List<Flight> flights = flightService.searchFlights(
                    origin.trim().toLowerCase(),
                    destination.trim().toLowerCase(),
                    departureDate
            );

            return ResponseEntity.ok(flights);
        } catch (Exception e) {
            logger.error("Error searching flights: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error searching flights: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getFlightById(@PathVariable Long id) {
        try {
            logger.info("Fetching flight with ID: {}", id);
            Flight flight = flightService.getFlightById(id);
            
            // Check if flight is in the past and return appropriate response
            if (flight != null) {
                if (flight.getDepartureTime().isBefore(LocalDateTime.now())) {
                    logger.warn("Attempt to retrieve past flight with ID: {}", id);
                    return ResponseEntity.badRequest()
                        .body("Flight with ID " + id + " has already departed");
                }
                return ResponseEntity.ok(flight);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Error fetching flight with ID {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching flight: " + e.getMessage());
        }
    }
    
    // Admin endpoint to get a flight by ID without the past flight check
    @GetMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getFlightByIdAdmin(@PathVariable Long id) {
        try {
            logger.info("Admin fetching flight with ID: {}", id);
            Flight flight = flightService.getFlightById(id);
            
            if (flight != null) {
                return ResponseEntity.ok(flight);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            logger.error("Error fetching flight with ID {} for admin: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching flight: " + e.getMessage());
        }
    }
    
    // Create a new flight - admin only
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createFlight(@RequestBody Flight flight) {
        try {
            logger.info("Creating new flight: {}", flight.getFlightNumber());
            Flight createdFlight = flightService.createFlight(flight);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdFlight);
        } catch (Exception e) {
            logger.error("Error creating flight: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating flight: " + e.getMessage());
        }
    }
    
    // Update a flight - admin only
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateFlight(@PathVariable Long id, @RequestBody Flight flight) {
        try {
            logger.info("Updating flight with ID: {}", id);
            Flight existingFlight = flightService.getFlightById(id);
            
            if (existingFlight == null) {
                return ResponseEntity.notFound().build();
            }
            
            flight.setId(id);
            Flight updatedFlight = flightService.updateFlight(flight);
            return ResponseEntity.ok(updatedFlight);
        } catch (Exception e) {
            logger.error("Error updating flight with ID {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating flight: " + e.getMessage());
        }
    }
    
    // Delete a flight - admin only
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteFlight(@PathVariable Long id) {
        try {
            logger.info("Deleting flight with ID: {}", id);
            Flight existingFlight = flightService.getFlightById(id);
            
            if (existingFlight == null) {
                return ResponseEntity.notFound().build();
            }
            
            flightService.deleteFlight(id);
            return ResponseEntity.ok("Flight deleted successfully");
        } catch (Exception e) {
            logger.error("Error deleting flight with ID {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error deleting flight: " + e.getMessage());
        }
    }
    
    @PostMapping("/api-flight/save")
    public ResponseEntity<?> saveApiFlightToDatabase(@RequestBody Flight flight) {
        try {
            logger.info("Saving API flight to database: {}", flight.getFlightNumber());
            
            if (!flight.isApiSourced()) {
                return ResponseEntity.badRequest()
                    .body("Only API-sourced flights can be saved with this endpoint");
            }
            
            Flight savedFlight = flightService.saveApiFlightToDatabase(flight);
            
            logger.info("API flight saved or found with ID: {}", savedFlight.getId());
            return ResponseEntity.ok(savedFlight);
        } catch (Exception e) {
            logger.error("Error saving API flight to database: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error saving API flight: " + e.getMessage());
        }
    }
    
    /**
     * Check if an API flight already exists in the database
     * This helps prevent duplicate entries for the same flight
     */
    @PostMapping("/api-flight/check-exists")
    public ResponseEntity<?> checkApiFlightExists(@RequestBody Flight flight) {
        try {
            logger.info("Checking if API flight exists: {}", flight.getFlightNumber());
            
            if (!flight.isApiSourced()) {
                return ResponseEntity.badRequest()
                    .body("Only API-sourced flights can be checked with this endpoint");
            }
            
            // Use the same logic as in saveApiFlightToDatabase but without saving
            LocalDateTime departureMinus = flight.getDepartureTime().minusMinutes(1);
            LocalDateTime departurePlus = flight.getDepartureTime().plusMinutes(1);
            
            List<Flight> existingFlights = flightRepository.searchFlightsIgnoreCase(
                flight.getOrigin(),
                flight.getDestination(),
                departureMinus,
                departurePlus
            );
            
            Flight existingFlight = existingFlights.stream()
                .filter(f -> f.getFlightNumber().equalsIgnoreCase(flight.getFlightNumber()))
                .findFirst()
                .orElse(null);
            
            if (existingFlight != null) {
                logger.info("Found existing flight in database with ID {}: {}", 
                    existingFlight.getId(), existingFlight.getFlightNumber());
                    
                // Return the existing flight details
                Map<String, Object> response = new HashMap<>();
                response.put("exists", true);
                response.put("flight", existingFlight);
                return ResponseEntity.ok(response);
            }
            
            // No existing flight found
            Map<String, Object> response = new HashMap<>();
            response.put("exists", false);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error checking if API flight exists: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error checking API flight: " + e.getMessage());
        }
    }
    
    // Admin-only endpoint to toggle API mode
    @PostMapping("/toggle-api-mode")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleApiMode(@RequestParam boolean enableApi) {
        try {
            logger.info("Admin toggling API mode to: {}", enableApi);
            appFeatureConfig.setUseApi(enableApi);
            return ResponseEntity.ok("API mode set to: " + enableApi);
        } catch (Exception e) {
            logger.error("Error toggling API mode: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error toggling API mode: " + e.getMessage());
        }
    }
    
    // Admin-only endpoint to get API usage statistics
    @GetMapping("/api-usage")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getApiUsageStats() {
        try {
            logger.info("Admin retrieving API usage statistics");
            return ResponseEntity.ok(
                    "API calls this month: " + apiQuotaConfig.getCallsThisMonth() + 
                    " / Max: " + apiQuotaConfig.getMaxCallsPerMonth() + 
                    " (" + (apiQuotaConfig.getCallsThisMonth() * 100 / apiQuotaConfig.getMaxCallsPerMonth()) + "%)"
            );
        } catch (Exception e) {
            logger.error("Error retrieving API usage stats: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving API usage stats: " + e.getMessage());
        }
    }
    
    // Admin-only endpoint to get API status
    @GetMapping("/api-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getApiStatus() {
        try {
            logger.info("Admin retrieving API status");
            Map<String, Object> response = new HashMap<>();
            response.put("enabled", appFeatureConfig.isUseApi());
            response.put("quotaRemaining", apiQuotaConfig.hasQuotaRemaining());
            response.put("callsThisMonth", apiQuotaConfig.getCallsThisMonth());
            response.put("maxCallsPerMonth", apiQuotaConfig.getMaxCallsPerMonth());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error retrieving API status: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving API status: " + e.getMessage());
        }
    }

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        logger.info("Testing flight controller");
        return ResponseEntity.ok("Flight controller is working");
    }
}