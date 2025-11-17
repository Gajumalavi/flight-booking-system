package com.example.ticket_booking_backend.exception;

public class BookingException extends RuntimeException {
    private final Long flightId;
    
    public BookingException(String message) {
        super(message);
        this.flightId = null;
    }
    
    public BookingException(String message, Long flightId) {
        super(message);
        this.flightId = flightId;
    }
    
    public BookingException(String message, Long flightId, Throwable cause) {
        super(message, cause);
        this.flightId = flightId;
    }
    
    public Long getFlightId() {
        return flightId;
    }
} 