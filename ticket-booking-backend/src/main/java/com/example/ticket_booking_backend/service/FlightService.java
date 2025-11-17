package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.config.AppFeatureConfig;
import com.example.ticket_booking_backend.dto.amadeus.AmadeusFlightOffersResponse;
import com.example.ticket_booking_backend.model.Airport;
import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.model.FlightReportFilter;
import com.example.ticket_booking_backend.model.FlightReport;
import com.example.ticket_booking_backend.repository.AirportRepository;
import com.example.ticket_booking_backend.repository.FlightRepository;
import com.example.ticket_booking_backend.repository.BookingRepository;
import com.example.ticket_booking_backend.model.Booking;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import java.util.HashMap;

@Service
public class FlightService {
    private static final Logger logger = LoggerFactory.getLogger(FlightService.class);

    private final FlightRepository flightRepository;
    private final AmadeusApiClient amadeusApiClient;
    private final FlightMapperService flightMapperService;
    private final AppFeatureConfig appFeatureConfig;
    private final SeatService seatService;
    private final AirportRepository airportRepository;
    private final BookingRepository bookingRepository;

    @Autowired
    public FlightService(FlightRepository flightRepository, 
                         AmadeusApiClient amadeusApiClient,
                         FlightMapperService flightMapperService,
                         AppFeatureConfig appFeatureConfig,
                         SeatService seatService,
                         AirportRepository airportRepository,
                         BookingRepository bookingRepository) {
        this.flightRepository = flightRepository;
        this.amadeusApiClient = amadeusApiClient;
        this.flightMapperService = flightMapperService;
        this.appFeatureConfig = appFeatureConfig;
        this.seatService = seatService;
        this.airportRepository = airportRepository;
        this.bookingRepository = bookingRepository;
    }

    // Add the missing getAllFlights method
    public List<Flight> getAllFlights() {
        return flightRepository.findAll();
    }

    // Add searchFlights method
    public List<Flight> searchFlights(String origin, String destination, LocalDate departureDate) {
        logger.info("Searching flights from {} to {} on {}, API mode: {}", 
                origin, destination, departureDate, appFeatureConfig.isUseApi());
        
        if (origin == null || destination == null || departureDate == null) {
            logger.error("Invalid search parameters: origin={}, destination={}, date={}", 
                origin, destination, departureDate);
            throw new IllegalArgumentException("Origin, destination, and departure date are required");
        }
        
        // Normalize inputs to prevent case sensitivity issues
        String originInput = origin.trim();
        String destinationInput = destination.trim();
        
        // Try to convert city names to airport codes (if they are city names)
        String originCode = convertToAirportCode(originInput);
        String destinationCode = convertToAirportCode(destinationInput);
        
        logger.info("Using origin code: {} and destination code: {}", originCode, destinationCode);
        
        // If API feature is enabled, try to get flights from API first
        if (appFeatureConfig.isUseApi()) {
            try {
                logger.info("Attempting to search flights using Amadeus API");
                List<Flight> apiFlights = searchFlightsFromApi(originCode, destinationCode, departureDate);
                
                if (!apiFlights.isEmpty()) {
                    logger.info("Found {} flights from API", apiFlights.size());
                    
                    // Convert prices from EUR to INR for display
                    apiFlights.forEach(this::convertFlightPriceForDisplay);
                    
                    return apiFlights;
                } else {
                    logger.info("No flights found from API, falling back to database");
                }
            } catch (Exception e) {
                logger.error("Error searching flights from API: {}", e.getMessage());
                logger.info("Falling back to database search");
            }
        }
        
        // Fall back to database search if API is disabled or API search failed or returned no results
        LocalDateTime startOfDay = departureDate.atStartOfDay();
        LocalDateTime endOfDay = departureDate.atTime(23, 59, 59);

        // First try exact match
        List<Flight> dbFlights = flightRepository.searchFlightsIgnoreCase(
                originCode,
                destinationCode,
                startOfDay,
                endOfDay
        );
        
        // If no results, try a more flexible search (this could be implemented in the repository)
        if (dbFlights.isEmpty()) {
            logger.info("No exact matches found, trying alternative search approach");
            // This would be the place to add more flexible search logic if needed
        }
        
        logger.info("Found {} flights from database", dbFlights.size());
        return dbFlights;
    }
    
    /**
     * Convert city name to airport code if possible
     * @param input - Can be either city name or airport code
     * @return Airport code (if input was a city name) or the original input (if it's already a code)
     */
    private String convertToAirportCode(String input) {
        if (input == null || input.trim().isEmpty()) {
            return input;
        }
        
        // Normalize input
        String normalizedInput = input.trim();
        
        // If input is already 3 letters (likely an airport code), return in uppercase
        if (normalizedInput.length() == 3 && normalizedInput.matches("[A-Za-z]{3}")) {
            return normalizedInput.toUpperCase();
        }
        
        // Hard-coded mappings for common cities - case insensitive check
        String lowerInput = normalizedInput.toLowerCase();
        switch (lowerInput) {
            case "mumbai":
            case "bombay":
                return "BOM";
            case "delhi":
            case "new delhi":
                return "DEL";
            case "bangalore":
            case "bengaluru":
                return "BLR";
            case "chennai":
            case "madras":
                return "MAA";
            case "kolkata":
            case "calcutta":
                return "CCU";
            case "hyderabad":
                return "HYD";
            case "goa":
            case "panaji":
                return "GOI";
            case "kochi":
            case "cochin":
                return "COK";
            case "new york":
                return "JFK";
            case "london":
                return "LHR";
            case "paris":
                return "CDG";
            case "dubai":
                return "DXB";
            case "singapore":
                return "SIN";
            case "tokyo":
                return "HND";
            case "sydney":
                return "SYD";
            case "hong kong":
                return "HKG";
            case "frankfurt":
                return "FRA";
            case "amsterdam":
                return "AMS";
            case "madrid":
                return "MAD";
            case "rome":
                return "FCO";
            case "zurich":
                return "ZRH";
            case "istanbul":
                return "IST";
            case "doha":
                return "DOH";
            case "abu dhabi":
                return "AUH";
            case "bangkok":
                return "BKK";
            case "kuala lumpur":
                return "KUL";
            case "manila":
                return "MNL";
            case "jakarta":
                return "CGK";
            case "beijing":
                return "PEK";
            case "shanghai":
                return "PVG";
            case "seoul":
                return "ICN";
            case "melbourne":
                return "MEL";
            case "auckland":
                return "AKL";
            case "vancouver":
                return "YVR";
            case "toronto":
                return "YYZ";
            case "sao paulo":
                return "GRU";
            case "buenos aires":
                return "EZE";
            case "cape town":
                return "CPT";
            case "johannesburg":
                return "JNB";
        }
        
        // Check if we can map this city name to an airport code from the database
        try {
            // Try to find the airport code for the city
            List<Airport> airports = airportRepository.searchAirports(normalizedInput);
            
            if (!airports.isEmpty()) {
                // Use the first matching airport's code
                String code = airports.get(0).getCode().toUpperCase();
                logger.info("Converted city '{}' to airport code '{}'", normalizedInput, code);
                return code;
            }
        } catch (Exception e) {
            logger.warn("Error trying to convert city name to airport code: {}", e.getMessage());
        }
        
        // If we couldn't find a match, return the original input (in uppercase if it's 3 chars)
        return normalizedInput.length() == 3 ? normalizedInput.toUpperCase() : normalizedInput;
    }
    
    /**
     * Search flights from the Amadeus API
     */
    private List<Flight> searchFlightsFromApi(String origin, String destination, LocalDate departureDate) {
        try {
            Mono<AmadeusFlightOffersResponse> responseMono = amadeusApiClient.searchFlights(
                    origin.toUpperCase(), destination.toUpperCase(), departureDate);
            
            // Block to get the response (non-reactive approach for simplicity)
            AmadeusFlightOffersResponse response = responseMono.block();
            
            if (response != null && response.getData() != null && !response.getData().isEmpty()) {
                // Map the API response to our Flight model
                List<Flight> flights = flightMapperService.mapApiResponseToFlights(response);
                
                // Mark all flights as API sourced
                flights.forEach(flight -> {
                    flight.setApiSourced(true);
                    if (response.getData().size() > 0) {
                    flight.setApiId(response.getData().get(0).getId());
                    }
                });
                
                return flights;
            }
        } catch (Exception e) {
            logger.error("Error searching flights from API: {}", e.getMessage());
            throw e;
        }
        
        return new ArrayList<>();
    }

    // Get flight by ID
    public Flight getFlightById(Long id) {
        return flightRepository.findById(id)
                .orElse(null);
    }
    
    /**
     * Create a new flight
     */
    @Transactional
    public Flight createFlight(Flight flight) {
        logger.info("Creating new flight: {}", flight.getFlightNumber());
        return saveFlight(flight);
    }
    
    /**
     * Update an existing flight
     */
    @Transactional
    public Flight updateFlight(Flight flight) {
        logger.info("Updating flight with ID: {}", flight.getId());
        
        // Check if the flight exists
        flightRepository.findById(flight.getId())
            .orElseThrow(() -> new RuntimeException("Flight not found with id: " + flight.getId()));
        
        // Save the updated flight
        return flightRepository.save(flight);
    }
    
    /**
     * Delete a flight by ID
     */
    @Transactional
    public void deleteFlight(Long id) {
        logger.info("Deleting flight with ID: {}", id);
        
        // Check if the flight exists
        Flight flight = flightRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Flight not found with id: " + id));
        
        // Delete the flight
        flightRepository.delete(flight);
    }

    // Save a new flight
    @Transactional
    public Flight saveFlight(Flight flight) {
        // Initialize empty seats list if null
        if (flight.getSeats() == null) {
            flight.setSeats(new ArrayList<>());
        }

        // Save the flight first
        Flight savedFlight = flightRepository.save(flight);

        // Initialize seats for the flight
        initializeSeatsForFlight(savedFlight);

        return savedFlight;
    }
    
    /**
     * Save an API flight to the database
     */
    @Transactional
    public Flight saveApiFlightToDatabase(Flight flight) {
        logger.info("Saving API flight to database: {}", flight.getFlightNumber());
        
        // Convert price from EUR to INR if the flight is from API
        if (flight.isApiSourced()) {
            // Check if price already appears to be in INR (greater than typical EUR amounts)
            // Threshold of 1000 - if price > 1000, it's likely already converted to INR
            if (flight.getPrice() < 1000) {
                logger.info("Price appears to be in EUR, converting to INR: {}", flight.getPrice());
                convertFlightPriceForDisplay(flight);
            } else {
                logger.info("Price appears to be already in INR, keeping as is: {}", flight.getPrice());
            }
        }
        
        // Check if flight already exists in the database
        // For API-sourced flights, we check with a time window to handle small variations
        if (flight.isApiSourced()) {
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
                    
                return existingFlight;
            }
        }
        
        // If no existing flight found, create a new one
        logger.info("No existing flight found, creating new flight entry for: {}", 
            flight.getFlightNumber());
        
        // Clear the temporary ID as it will be auto-generated when saved
        flight.setId(null);
        
        // Ensure this flight is marked as API sourced
        flight.setApiSourced(true);
        
        // Lookup and enrich with airport details before saving
        enrichFlightWithAirportDetails(flight);
        
        // Save to database
        return saveFlight(flight);
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
            // Don't fail the save operation if airport enrichment fails
        }
    }

    @Transactional
    public void initializeSeatsForFlight(Flight flight) {
        // Initialize seats A1-F10 (60 seats)
        for (char row = 'A'; row <= 'F'; row++) {
            for (int number = 1; number <= 10; number++) {
                Seat seat = new Seat();
                seat.setSeatNumber(row + String.valueOf(number));
                seat.setAvailable(true);
                seat.setFlight(flight);
                flight.getSeats().add(seat);
            }
        }
        flightRepository.save(flight);
    }

    /**
     * Convert a flight's price from EUR to INR for display purposes
     * This method modifies the flight object directly but does not save it to the database
     */
    private void convertFlightPriceForDisplay(Flight flight) {
        if (flight.isApiSourced()) {
            // Using a realistic conversion rate of 1 EUR = 90 INR (approx)
            double originalPrice = flight.getPrice();
            double randomFactor = 0.9 + Math.random() * 0.2; // Random between 0.9 and 1.1
            double priceInINR = originalPrice * 90.0 * randomFactor;
            flight.setPrice(Math.round(priceInINR)); // Round to avoid decimal values
            logger.info("Converted display price from {} EUR to {} INR", originalPrice, flight.getPrice());
        }
    }

    public FlightReport generateFlightReport(FlightReportFilter filter) {
        FlightReport report = new FlightReport();
        try {
            // Get origin and destination from filter
            String origin = filter.getOrigin().trim().toUpperCase();
            String destination = filter.getDestination().trim().toUpperCase();

            // Parse dates
            LocalDate start = LocalDate.parse(filter.getStartDate());
            LocalDate end = LocalDate.parse(filter.getEndDate());
            LocalDateTime startDateTime = start.atStartOfDay();
            LocalDateTime endDateTime = end.atTime(23, 59, 59);

            // Query flights for the route and date range
            List<Flight> flights = flightRepository.findByOriginAndDestinationAndDepartureTimeBetween(
                origin, destination, startDateTime, endDateTime);

            // Query bookings for the route and date range
            List<Booking> bookings = bookingRepository.findAll().stream()
                .filter(b -> b.getFlight().getOrigin().equalsIgnoreCase(origin)
                        && b.getFlight().getDestination().equalsIgnoreCase(destination)
                        && !b.getBookingTime().isBefore(startDateTime)
                        && !b.getBookingTime().isAfter(endDateTime))
                .toList();

            // Analytics
            report.setRoute(origin + "-" + destination);
            report.setSearchCount(flights.size());
            report.setBookingCount(bookings.size());
            report.setConversionRate(flights.size() > 0 ? (100.0 * bookings.size() / flights.size()) : 0.0);

            // Price analysis
            BigDecimal minPrice = null, maxPrice = null, totalPrice = BigDecimal.ZERO;
            int priceCount = 0;
            for (Flight f : flights) {
                BigDecimal price = BigDecimal.valueOf(f.getPrice());
                if (minPrice == null || price.compareTo(minPrice) < 0) minPrice = price;
                if (maxPrice == null || price.compareTo(maxPrice) > 0) maxPrice = price;
                totalPrice = totalPrice.add(price);
                priceCount++;
            }
            report.setMinPrice(minPrice);
            report.setMaxPrice(maxPrice);
            report.setAveragePrice(priceCount > 0 ? totalPrice.divide(BigDecimal.valueOf(priceCount), 2, BigDecimal.ROUND_HALF_UP) : null);

            // Popular routes (top N in this period)
            HashMap<String, Integer> routeCounts = new HashMap<>();
            for (Flight f : flights) {
                String r = f.getOrigin() + "-" + f.getDestination();
                routeCounts.put(r, routeCounts.getOrDefault(r, 0) + 1);
            }
            report.setPopularRoutes(routeCounts);

            // Average prices by route
            HashMap<String, BigDecimal> avgPrices = new HashMap<>();
            for (String r : routeCounts.keySet()) {
                List<Flight> routeFlights = flights.stream().filter(f -> (f.getOrigin() + "-" + f.getDestination()).equals(r)).toList();
                if (!routeFlights.isEmpty()) {
                    BigDecimal sum = routeFlights.stream().map(f -> BigDecimal.valueOf(f.getPrice())).reduce(BigDecimal.ZERO, BigDecimal::add);
                    avgPrices.put(r, sum.divide(BigDecimal.valueOf(routeFlights.size()), 2, BigDecimal.ROUND_HALF_UP));
                }
            }
            report.setAveragePrices(avgPrices);

            // Search frequency (by day)
            HashMap<String, Integer> searchFreq = new HashMap<>();
            for (Flight f : flights) {
                String day = f.getDepartureTime().toLocalDate().toString();
                searchFreq.put(day, searchFreq.getOrDefault(day, 0) + 1);
            }
            report.setSearchFrequency(searchFreq);

            // Search distribution (by hour)
            HashMap<String, Integer> searchDist = new HashMap<>();
            for (Flight f : flights) {
                String hour = String.valueOf(f.getDepartureTime().getHour());
                searchDist.put(hour, searchDist.getOrDefault(hour, 0) + 1);
            }
            report.setSearchDistribution(searchDist);

            // Total searches
            report.setTotalSearches(flights.size());
        } catch (Exception e) {
            logger.error("Error generating flight report: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate flight report: " + e.getMessage());
        }
        return report;
    }
}