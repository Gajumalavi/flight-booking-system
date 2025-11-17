package com.example.ticket_booking_backend.dto;

/**
 * Data Transfer Object for seat update events sent to clients
 */
public class SeatUpdateDTO {
    private Long flightId;
    private Long seatId;
    private boolean available;
    private String status;
    private long timestamp;
    
    // Default constructor required for Jackson JSON conversion
    public SeatUpdateDTO() {
    }
    
    public SeatUpdateDTO(Long flightId, Long seatId, boolean available, String status, long timestamp) {
        this.flightId = flightId;
        this.seatId = seatId;
        this.available = available;
        this.status = status;
        this.timestamp = timestamp;
    }
    
    // Getters and setters
    public Long getFlightId() {
        return flightId;
    }
    
    public void setFlightId(Long flightId) {
        this.flightId = flightId;
    }
    
    public Long getSeatId() {
        return seatId;
    }
    
    public void setSeatId(Long seatId) {
        this.seatId = seatId;
    }
    
    public boolean isAvailable() {
        return available;
    }
    
    public void setAvailable(boolean available) {
        this.available = available;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public long getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
    
    @Override
    public String toString() {
        return "SeatUpdateDTO{" +
                "flightId=" + flightId +
                ", seatId=" + seatId +
                ", available=" + available +
                ", status='" + status + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}