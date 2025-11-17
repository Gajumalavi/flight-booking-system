package com.example.ticket_booking_backend.exception;

public class SeatHoldTimedOutException extends RuntimeException {
    private final Long seatId;
    private final Long flightId;
    
    public SeatHoldTimedOutException(Long seatId, Long flightId) {
        super(String.format("Hold on seat %d for flight %d has timed out", seatId, flightId));
        this.seatId = seatId;
        this.flightId = flightId;
    }
    
    public SeatHoldTimedOutException(Long seatId, Long flightId, String message) {
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