package com.example.ticket_booking_backend.config;

import com.example.ticket_booking_backend.model.Airport;
import com.example.ticket_booking_backend.repository.AirportRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class DataInitializer {
    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);
    
    private final AirportRepository airportRepository;
    
    @Bean
    @Transactional
    public CommandLineRunner initAirports() {
        return args -> {
            long count = airportRepository.count();
            
            if (count == 0) {
                logger.info("No airports found in database. Initializing with default airports...");
                importDefaultAirports();
            } else {
                logger.info("Found {} airports in database. Skipping initialization.", count);
            }
        };
    }
    
    private void importDefaultAirports() {
        List<Airport> airports = new ArrayList<>();
        
        // Major international airports in India
        airports.add(createAirport("DEL", "Indira Gandhi International Airport", "Delhi", "Delhi", "India"));
        airports.add(createAirport("BOM", "Chhatrapati Shivaji Maharaj International Airport", "Mumbai", "Maharashtra", "India"));
        airports.add(createAirport("BLR", "Kempegowda International Airport", "Bangalore", "Karnataka", "India"));
        airports.add(createAirport("MAA", "Chennai International Airport", "Chennai", "Tamil Nadu", "India"));
        airports.add(createAirport("HYD", "Rajiv Gandhi International Airport", "Hyderabad", "Telangana", "India"));
        airports.add(createAirport("CCU", "Netaji Subhas Chandra Bose International Airport", "Kolkata", "West Bengal", "India"));
        airports.add(createAirport("COK", "Cochin International Airport", "Kochi", "Kerala", "India"));
        airports.add(createAirport("GOI", "Goa International Airport", "Goa", "Goa", "India"));
        airports.add(createAirport("GOX", "Manohar International Airport", "Goa", "Goa", "India"));
        
        // International airports
        airports.add(createAirport("JFK", "John F. Kennedy International Airport", "New York", "New York", "USA"));
        airports.add(createAirport("LHR", "Heathrow Airport", "London", "England", "United Kingdom"));
        airports.add(createAirport("CDG", "Charles de Gaulle Airport", "Paris", "Île-de-France", "France"));
        airports.add(createAirport("DXB", "Dubai International Airport", "Dubai", "Dubai", "UAE"));
        airports.add(createAirport("SIN", "Singapore Changi Airport", "Singapore", "Singapore", "Singapore"));
        airports.add(createAirport("HND", "Haneda Airport", "Tokyo", "Tokyo", "Japan"));
        airports.add(createAirport("SYD", "Sydney Airport", "Sydney", "New South Wales", "Australia"));
        airports.add(createAirport("HKG", "Hong Kong International Airport", "Hong Kong", "Hong Kong", "China"));
        airports.add(createAirport("FRA", "Frankfurt Airport", "Frankfurt", "Hesse", "Germany"));
        airports.add(createAirport("AMS", "Amsterdam Airport Schiphol", "Amsterdam", "North Holland", "Netherlands"));
        airports.add(createAirport("MAD", "Adolfo Suárez Madrid–Barajas Airport", "Madrid", "Madrid", "Spain"));
        airports.add(createAirport("FCO", "Leonardo da Vinci International Airport", "Rome", "Lazio", "Italy"));
        airports.add(createAirport("ZRH", "Zurich Airport", "Zurich", "Zurich", "Switzerland"));
        airports.add(createAirport("IST", "Istanbul Airport", "Istanbul", "Istanbul", "Turkey"));
        airports.add(createAirport("DOH", "Hamad International Airport", "Doha", "Doha", "Qatar"));
        airports.add(createAirport("AUH", "Abu Dhabi International Airport", "Abu Dhabi", "Abu Dhabi", "UAE"));
        airports.add(createAirport("BKK", "Suvarnabhumi Airport", "Bangkok", "Bangkok", "Thailand"));
        airports.add(createAirport("KUL", "Kuala Lumpur International Airport", "Kuala Lumpur", "Selangor", "Malaysia"));
        airports.add(createAirport("MNL", "Ninoy Aquino International Airport", "Manila", "Metro Manila", "Philippines"));
        airports.add(createAirport("CGK", "Soekarno–Hatta International Airport", "Jakarta", "Jakarta", "Indonesia"));
        airports.add(createAirport("PEK", "Beijing Capital International Airport", "Beijing", "Beijing", "China"));
        airports.add(createAirport("PVG", "Shanghai Pudong International Airport", "Shanghai", "Shanghai", "China"));
        airports.add(createAirport("ICN", "Incheon International Airport", "Seoul", "Incheon", "South Korea"));
        airports.add(createAirport("MEL", "Melbourne Airport", "Melbourne", "Victoria", "Australia"));
        airports.add(createAirport("AKL", "Auckland Airport", "Auckland", "Auckland", "New Zealand"));
        airports.add(createAirport("YVR", "Vancouver International Airport", "Vancouver", "British Columbia", "Canada"));
        airports.add(createAirport("YYZ", "Toronto Pearson International Airport", "Toronto", "Ontario", "Canada"));
        airports.add(createAirport("GRU", "São Paulo/Guarulhos International Airport", "São Paulo", "São Paulo", "Brazil"));
        airports.add(createAirport("EZE", "Ministro Pistarini International Airport", "Buenos Aires", "Buenos Aires", "Argentina"));
        airports.add(createAirport("CPT", "Cape Town International Airport", "Cape Town", "Western Cape", "South Africa"));
        airports.add(createAirport("JNB", "O.R. Tambo International Airport", "Johannesburg", "Gauteng", "South Africa"));
        
        airportRepository.saveAll(airports);
        logger.info("Successfully imported {} airports to database", airports.size());
    }
    
    private Airport createAirport(String code, String name, String city, String state, String country) {
        Airport airport = new Airport();
        airport.setCode(code);
        airport.setName(name);
        airport.setCity(city);
        airport.setState(state);
        airport.setCountry(country);
        return airport;
    }
} 