package com.example.ticket_booking_backend.exception;

public class SeatNotAvailableException extends RuntimeException {
    private final Long seatId;
    private final Long flightId;
    
    public SeatNotAvailableException(Long seatId, Long flightId) {
        super(String.format("Seat %d for flight %d is not available", seatId, flightId));
        this.seatId = seatId;
        this.flightId = flightId;
    }
    
    public SeatNotAvailableException(Long seatId, Long flightId, String message) {
        super(message);
        this.seatId = seatId;
        this.flightId = flightId;
    }
    
    public Long getSeatId() {
        return seatId;
    }
    
    public Long getFlightId() {
        return flightId;
    }
} 