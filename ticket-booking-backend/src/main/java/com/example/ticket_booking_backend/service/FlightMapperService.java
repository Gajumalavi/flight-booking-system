package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.dto.amadeus.AmadeusFlightOffer;
import com.example.ticket_booking_backend.dto.amadeus.AmadeusFlightOffersResponse;
import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.repository.AirportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class FlightMapperService {
    private static final Logger logger = LoggerFactory.getLogger(FlightMapperService.class);
    private static final DateTimeFormatter API_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    
    // Use a static counter for generating temporary IDs for API flights
    // These will be properly assigned when saved to the database
    private static final AtomicLong idCounter = new AtomicLong(10000);
    
    private final AirportRepository airportRepository;
    
    @Autowired
    public FlightMapperService(AirportRepository airportRepository) {
        this.airportRepository = airportRepository;
    }
    
    /**
     * Maps Amadeus flight offers to our Flight model
     */
    public List<Flight> mapApiResponseToFlights(AmadeusFlightOffersResponse response) {
        List<Flight> flights = new ArrayList<>();
        
        if (response == null || response.getData() == null) {
            logger.warn("No flight data found in API response");
            return flights;
        }
        
        logger.info("Mapping {} flight offers from API", response.getData().size());
        
        for (AmadeusFlightOffer offer : response.getData()) {
            try {
                Flight flight = mapOfferToFlight(offer);
                if (flight != null) {
                    // Enrich with airport details
                    enrichFlightWithAirportDetails(flight);
                    flights.add(flight);
                }
            } catch (Exception e) {
                logger.error("Error mapping flight offer to Flight model: {}", e.getMessage());
            }
        }
        
        return flights;
    }
    
    /**
     * Maps a single Amadeus flight offer to our Flight model
     */
    private Flight mapOfferToFlight(AmadeusFlightOffer offer) {
        if (offer.getItineraries() == null || offer.getItineraries().isEmpty() ||
            offer.getItineraries().get(0).getSegments() == null || 
            offer.getItineraries().get(0).getSegments().isEmpty()) {
            logger.warn("Incomplete flight offer data found");
            return null;
        }
        
        // Get the first segment of the first itinerary
        AmadeusFlightOffer.Segment segment = offer.getItineraries().get(0).getSegments().get(0);
        
        Flight flight = new Flight();
        
        // Generate a temporary ID for this API flight
        flight.setId(idCounter.incrementAndGet());
        
        // Set flight number from carrier code and flight number
        flight.setFlightNumber(segment.getCarrierCode() + segment.getNumber());
        
        // Set origin and destination from IATA codes
        flight.setOrigin(segment.getDeparture().getIataCode());
        flight.setDestination(segment.getArrival().getIataCode());
        
        // Parse and set departure and arrival times
        try {
            flight.setDepartureTime(LocalDateTime.parse(segment.getDeparture().getAt(), API_DATE_FORMATTER));
            flight.setArrivalTime(LocalDateTime.parse(segment.getArrival().getAt(), API_DATE_FORMATTER));
        } catch (Exception e) {
            logger.error("Error parsing date/time from API: {}", e.getMessage());
            return null;
        }
        
        // Set price from offer
        double price = Double.parseDouble(offer.getPrice().getTotal());
        logger.info("Parsed price from API: {} {}", price, offer.getPrice().getCurrency());
        
        // Store the original price (in EUR) - we'll convert it when saving to database
        flight.setPrice(price);
        
        // Set the airline name from carrier code
        flight.setAirline(segment.getCarrierCode());
        
        // Initialize seats list
        flight.setSeats(new ArrayList<>());
        
        // Initialize seats A1-F10 (60 seats) - same as in FlightService
        for (char row = 'A'; row <= 'F'; row++) {
            for (int number = 1; number <= 10; number++) {
                Seat seat = new Seat();
                seat.setSeatNumber(row + String.valueOf(number));
                seat.setAvailable(true);
                seat.setFlight(flight);
                flight.getSeats().add(seat);
            }
        }
        
        return flight;
    }
    
    /**
     * Enriches a flight with airport details (city and name) from the airport repository
     */
    private void enrichFlightWithAirportDetails(Flight flight) {
        try {
            // Enrich origin airport details
            if (flight.getOrigin() != null) {
                airportRepository.findByCode(flight.getOrigin()).ifPresent(airport -> {
                    logger.info("Enriching flight with origin airport details: {} - {}", 
                        airport.getCode(), airport.getName());
                    flight.setOriginCity(airport.getCity());
                    flight.setOriginName(airport.getName());
                });
            }
            
            // Enrich destination airport details
            if (flight.getDestination() != null) {
                airportRepository.findByCode(flight.getDestination()).ifPresent(airport -> {
                    logger.info("Enriching flight with destination airport details: {} - {}", 
                        airport.getCode(), airport.getName());
                    flight.setDestinationCity(airport.getCity());
                    flight.setDestinationName(airport.getName());
                });
            }
        } catch (Exception e) {
            logger.warn("Error enriching flight with airport details: {}", e.getMessage());
            // Don't fail the mapping operation if airport enrichment fails
        }
    }
} 