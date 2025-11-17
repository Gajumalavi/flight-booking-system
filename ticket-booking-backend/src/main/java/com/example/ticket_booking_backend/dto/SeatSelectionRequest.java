package com.example.ticket_booking_backend.dto;

/**
 * Data Transfer Object for WebSocket seat selection/release requests
 */
public class SeatSelectionRequest {
    private Long seatId;
    private Long flightId;
    private String userId; // Optional - could be used for tracking who selected the seat
    
    // Default constructor required for Jackson JSON conversion
    public SeatSelectionRequest() {
    }
    
    public SeatSelectionRequest(Long seatId, Long flightId, String userId) {
        this.seatId = seatId;
        this.flightId = flightId;
        this.userId = userId;
    }
    
    // Getters and setters
    public Long getSeatId() {
        return seatId;
    }
    
    public void setSeatId(Long seatId) {
        this.seatId = seatId;
    }
    
    public Long getFlightId() {
        return flightId;
    }
    
    public void setFlightId(Long flightId) {
        this.flightId = flightId;
    }
    
    public String getUserId() {
        return userId;
    }
    
    public void setUserId(String userId) {
        this.userId = userId;
    }
    
    @Override
    public String toString() {
        return "SeatSelectionRequest{" +
                "seatId=" + seatId +
                ", flightId=" + flightId +
                ", userId='" + userId + '\'' +
                '}';
    }
}