package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.Airport;
import com.example.ticket_booking_backend.repository.AirportRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class AirportService {

    private final AirportRepository airportRepository;

    @Autowired
    public AirportService(AirportRepository airportRepository) {
        this.airportRepository = airportRepository;
    }

    @Transactional(readOnly = true)
    public List<Airport> getAllAirports() {
        return airportRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Airport> getAirportByCode(String code) {
        return airportRepository.findByCode(code);
    }
    
    @Transactional(readOnly = true)
    public List<Airport> searchAirports(String query) {
        return airportRepository.searchAirports(query);
    }
    
    @Transactional(readOnly = true)
    public Page<Airport> getPagedAirports(Pageable pageable) {
        return airportRepository.findAll(pageable);
    }
} 