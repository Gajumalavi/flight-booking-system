package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.model.Airport;
import com.example.ticket_booking_backend.service.AirportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/airports")
@CrossOrigin(origins = "*") // Allow from any origin for testing
@Tag(name = "Airport API", description = "Endpoints for managing and searching airports")
public class AirportController {
    private static final Logger logger = LoggerFactory.getLogger(AirportController.class);
    private static final int MIN_QUERY_LENGTH = 2;

    private final AirportService airportService;

    @Autowired
    public AirportController(AirportService airportService) {
        this.airportService = airportService;
    }

    @GetMapping
    @PreAuthorize("permitAll()")
    @Operation(summary = "Get all airports", description = "Returns a list of all airports in the system")
    @ApiResponse(responseCode = "200", description = "Successfully retrieved all airports")
    public ResponseEntity<List<Airport>> getAllAirports() {
        logger.info("Getting all airports");
        List<Airport> airports = airportService.getAllAirports();
        logger.info("Found {} airports", airports.size());
        return ResponseEntity.ok(airports);
    }
    
    @GetMapping("/search")
    @PreAuthorize("permitAll()")
    @Operation(
        summary = "Search airports", 
        description = "Search airports by code, name, city, state, or country. Requires minimum 2 characters."
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved matching airports"),
        @ApiResponse(responseCode = "400", description = "Invalid query - less than 2 characters")
    })
    public ResponseEntity<?> searchAirports(
            @Parameter(description = "Search query (min 2 characters)", required = true)
            @RequestParam String query, 
            
            @Parameter(description = "Maximum number of results to return")
            @RequestParam(defaultValue = "10") int limit) {
        
        logger.info("Searching airports with query: {}", query);
        
        // Validate query length
        if (query == null || query.trim().length() < MIN_QUERY_LENGTH) {
            logger.warn("Query too short, minimum {} characters required", MIN_QUERY_LENGTH);
            return ResponseEntity.badRequest()
                .body(new ErrorResponse("Query must be at least " + MIN_QUERY_LENGTH + " characters long"));
        }
        
        List<Airport> results = airportService.searchAirports(query);
        
        // Limit results if needed
        if (results.size() > limit) {
            results = results.subList(0, limit);
        }
        
        logger.info("Found {} airports matching query: {}", results.size(), query);
        
        // Log each result for debugging
        for (Airport airport : results) {
            logger.info("Match: {} ({}) - {}, {}, {}", 
                    airport.getCity(), airport.getCode(), airport.getName(), 
                    airport.getState() != null ? airport.getState() : "", airport.getCountry());
        }
        
        return ResponseEntity.ok(results);
    }
    
    @GetMapping("/paged")
    @PreAuthorize("permitAll()")
    @Operation(
        summary = "Get paged airports", 
        description = "Returns a paginated list of airports"
    )
    @ApiResponse(responseCode = "200", description = "Successfully retrieved airports page")
    public ResponseEntity<Page<Airport>> getPagedAirports(
            @Parameter(description = "Page number (0-based)") 
            @RequestParam(defaultValue = "0") int page,
            
            @Parameter(description = "Page size") 
            @RequestParam(defaultValue = "20") int size) {
        
        logger.info("Getting paged airports, page: {}, size: {}", page, size);
        Pageable pageable = PageRequest.of(page, size);
        Page<Airport> airports = airportService.getPagedAirports(pageable);
        logger.info("Returned page {} of {}, with {} airports", 
                airports.getNumber(), airports.getTotalPages(), airports.getNumberOfElements());
        return ResponseEntity.ok(airports);
    }
    
    @GetMapping("/{code}")
    @PreAuthorize("permitAll()")
    @Operation(
        summary = "Get airport by code", 
        description = "Returns a specific airport by its IATA code"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved the airport"),
        @ApiResponse(responseCode = "404", description = "Airport not found")
    })
    public ResponseEntity<Airport> getAirportByCode(
            @Parameter(description = "IATA code of the airport", required = true)
            @PathVariable String code) {
        
        logger.info("Getting airport by code: {}", code);
        return airportService.getAirportByCode(code)
                .map(airport -> {
                    logger.info("Found airport: {} ({}) - {}, {}, {}", 
                            airport.getCity(), airport.getCode(), airport.getName(), 
                            airport.getState() != null ? airport.getState() : "", airport.getCountry());
                    return ResponseEntity.ok(airport);
                })
                .orElseGet(() -> {
                    logger.warn("Airport not found with code: {}", code);
                    return ResponseEntity.notFound().build();
                });
    }
    
    // Helper class for error responses
    private static class ErrorResponse {
        private String message;
        
        public ErrorResponse(String message) {
            this.message = message;
        }
        
        public String getMessage() {
            return message;
        }
    }
} 