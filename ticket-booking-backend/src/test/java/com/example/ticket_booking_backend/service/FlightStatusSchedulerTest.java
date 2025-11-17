package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.model.FlightStatus;
import com.example.ticket_booking_backend.repository.FlightRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class FlightStatusSchedulerTest {

    @Mock
    private FlightRepository flightRepository;

    @Mock
    private WebSocketService webSocketService;

    @InjectMocks
    private FlightStatusScheduler flightStatusScheduler;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testUpdateFlightsToInFlight() {
        // Setup test data
        LocalDateTime now = LocalDateTime.now();
        
        Flight flight1 = new Flight();
        flight1.setId(1L);
        flight1.setFlightNumber("TEST123");
        flight1.setStatus(FlightStatus.SCHEDULED);
        flight1.setDepartureTime(now.minusHours(1)); // Departed 1 hour ago
        flight1.setArrivalTime(now.plusHours(1)); // Will arrive in 1 hour
        
        List<Flight> departedFlights = List.of(flight1);
        
        // Mock repository response
        when(flightRepository.findByDepartureTimeLessThanAndArrivalTimeGreaterThanAndStatusNot(
                any(LocalDateTime.class), any(LocalDateTime.class), eq(FlightStatus.IN_FLIGHT)))
                .thenReturn(departedFlights);
        
        // Call method under test
        flightStatusScheduler.updateFlightStatuses();
        
        // Verify the flight status was updated
        ArgumentCaptor<Flight> flightCaptor = ArgumentCaptor.forClass(Flight.class);
        verify(flightRepository, times(1)).save(flightCaptor.capture());
        
        Flight updatedFlight = flightCaptor.getValue();
        assertEquals(FlightStatus.IN_FLIGHT, updatedFlight.getStatus());
        assertEquals(1L, updatedFlight.getId());
        
        // Verify WebSocket notification was sent
        verify(webSocketService, times(1)).notifyFlightUpdate(eq(1L), any(Map.class));
    }

    @Test
    void testUpdateFlightsToArrived() {
        // Setup test data
        LocalDateTime now = LocalDateTime.now();
        
        Flight flight1 = new Flight();
        flight1.setId(2L);
        flight1.setFlightNumber("TEST456");
        flight1.setStatus(FlightStatus.IN_FLIGHT);
        flight1.setDepartureTime(now.minusHours(3)); // Departed 3 hours ago
        flight1.setArrivalTime(now.minusMinutes(30)); // Arrived 30 minutes ago
        
        List<Flight> arrivedFlights = List.of(flight1);
        
        // Mock repository responses
        when(flightRepository.findByDepartureTimeLessThanAndArrivalTimeGreaterThanAndStatusNot(
                any(LocalDateTime.class), any(LocalDateTime.class), eq(FlightStatus.IN_FLIGHT)))
                .thenReturn(new ArrayList<>());
                
        when(flightRepository.findByArrivalTimeLessThanAndStatusNot(
                any(LocalDateTime.class), eq(FlightStatus.ARRIVED)))
                .thenReturn(arrivedFlights);
        
        // Call method under test
        flightStatusScheduler.updateFlightStatuses();
        
        // Verify the flight status was updated
        ArgumentCaptor<Flight> flightCaptor = ArgumentCaptor.forClass(Flight.class);
        verify(flightRepository, times(1)).save(flightCaptor.capture());
        
        Flight updatedFlight = flightCaptor.getValue();
        assertEquals(FlightStatus.ARRIVED, updatedFlight.getStatus());
        assertEquals(2L, updatedFlight.getId());
        
        // Verify WebSocket notification was sent
        verify(webSocketService, times(1)).notifyFlightUpdate(eq(2L), any(Map.class));
    }

    @Test
    void testHandleDelayedFlights() {
        // Setup test data
        LocalDateTime now = LocalDateTime.now();
        
        Flight flight1 = new Flight();
        flight1.setId(3L);
        flight1.setFlightNumber("TEST789");
        flight1.setStatus(FlightStatus.SCHEDULED);
        flight1.setDepartureTime(now.minusMinutes(30)); // Should have departed 30 minutes ago
        flight1.setArrivalTime(now.plusHours(1)); // Will arrive in 1 hour
        
        List<Flight> delayedFlights = List.of(flight1);
        
        // Mock repository responses
        when(flightRepository.findByDepartureTimeLessThanAndArrivalTimeGreaterThanAndStatusNot(
                any(LocalDateTime.class), any(LocalDateTime.class), eq(FlightStatus.IN_FLIGHT)))
                .thenReturn(new ArrayList<>());
                
        when(flightRepository.findByArrivalTimeLessThanAndStatusNot(
                any(LocalDateTime.class), eq(FlightStatus.ARRIVED)))
                .thenReturn(new ArrayList<>());
                
        when(flightRepository.findByStatusAndDepartureTimeLessThan(
                eq(FlightStatus.SCHEDULED), any(LocalDateTime.class)))
                .thenReturn(delayedFlights);
        
        // Call method under test
        flightStatusScheduler.updateFlightStatuses();
        
        // Verify the flight status was updated
        ArgumentCaptor<Flight> flightCaptor = ArgumentCaptor.forClass(Flight.class);
        verify(flightRepository, times(1)).save(flightCaptor.capture());
        
        Flight updatedFlight = flightCaptor.getValue();
        assertEquals(FlightStatus.DELAYED, updatedFlight.getStatus());
        assertEquals(3L, updatedFlight.getId());
        
        // Verify WebSocket notification was sent
        verify(webSocketService, times(1)).notifyFlightUpdate(eq(3L), any(Map.class));
    }
} 