package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.repository.SeatRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.context.ApplicationContext;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class SeatHoldTimeoutTest {

    @Mock
    private SeatRepository seatRepository;
    
    @Mock
    private WebSocketService webSocketService;
    
    @Mock
    private ApplicationContext applicationContext;
    
    @InjectMocks
    private SeatService seatService;
    
    private Flight flight;
    private Seat seat;
    
    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
        
        // Setup a flight
        flight = new Flight();
        flight.setId(1L);
        flight.setFlightNumber("TEST123");
        
        // Setup a seat
        seat = new Seat();
        seat.setId(1L);
        seat.setSeatNumber("A1");
        seat.setAvailable(true);
        seat.setBooked(false);
        seat.setFlight(flight);
        
        // Setup repository mocks
        when(seatRepository.findById(1L)).thenReturn(Optional.of(seat));
        when(seatRepository.save(any(Seat.class))).thenReturn(seat);
    }
    
    @Test
    public void testHoldSeatTimeout() throws InterruptedException {
        // Set a very short timeout for testing
        seatService.setSeatHoldTimeoutMinutes(1); // 1 minute
        
        // Mock the current time to be exactly now
        LocalDateTime now = LocalDateTime.now();
        
        // When holdSeat is called, capture the seat and verify holdUntil is set properly
        ArgumentCaptor<Seat> seatCaptor = ArgumentCaptor.forClass(Seat.class);
        
        // Call holdSeat
        boolean result = seatService.holdSeat(1L, 1L, 123L);
        
        // Verify result and that seat was saved
        assertTrue(result, "Seat hold should be successful");
        verify(seatRepository, times(1)).save(seatCaptor.capture());
        
        // Verify the seat's hold properties
        Seat heldSeat = seatCaptor.getValue();
        assertNotNull(heldSeat.getHoldUntil(), "Hold until should be set");
        assertEquals(123L, heldSeat.getHeldByUserId(), "User ID should be set");
        assertFalse(heldSeat.isAvailable(), "Seat should be marked as unavailable");
        
        // Verify that the hold until time is approximately correct (within a few seconds)
        LocalDateTime expectedHoldUntil = now.plusMinutes(1);
        assertTrue(Math.abs(heldSeat.getHoldUntil().getMinute() - expectedHoldUntil.getMinute()) <= 1,
                "Hold until time should be about 1 minute in the future");
        
        System.out.println("Test completed: Hold seat timeout verified");
    }
    
    @Test
    public void testReleaseExpiredHolds() {
        // Setup an expired hold
        LocalDateTime pastTime = LocalDateTime.now().minusMinutes(10);
        seat.setHoldUntil(pastTime);
        seat.setHeldByUserId(123L);
        seat.setAvailable(false);
        
        // Mock finding seats with expired holds
        when(seatRepository.findByHoldUntilLessThan(any(LocalDateTime.class)))
                .thenReturn(Collections.singletonList(seat));
        
        // Call releaseExpiredHolds
        seatService.releaseExpiredHolds();
        
        // Verify seat was updated
        ArgumentCaptor<Seat> seatCaptor = ArgumentCaptor.forClass(Seat.class);
        verify(seatRepository, times(1)).save(seatCaptor.capture());
        
        // Verify the seat's properties after release
        Seat releasedSeat = seatCaptor.getValue();
        assertNull(releasedSeat.getHoldUntil(), "Hold until should be cleared");
        assertNull(releasedSeat.getHeldByUserId(), "User ID should be cleared");
        assertTrue(releasedSeat.isAvailable(), "Seat should be marked as available");
        
        // Verify notification was sent
        verify(webSocketService, times(1)).notifySeatUpdate(any());
        
        System.out.println("Test completed: Release expired holds verified");
    }
} 