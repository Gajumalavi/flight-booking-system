package com.example.ticket_booking_backend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "flights")
public class Flight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String flightNumber;

    @Column(nullable = false)
    private String airline;

    @Column(nullable = false)
    private String origin;

    @Column
    private String originCity;

    @Column
    private String originState;

    @Column
    private String originName;

    @Column(nullable = false)
    private String destination;

    @Column
    private String destinationCity;

    @Column
    private String destinationState;

    @Column
    private String destinationName;

    @Column(nullable = false)
    private LocalDateTime departureTime;

    @Column(nullable = false)
    private LocalDateTime arrivalTime;

    @Column(nullable = false)
    private double price;

    @Column
    private Integer availableSeats = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FlightStatus status = FlightStatus.SCHEDULED;

    // New field to track if this flight was sourced from the API
    @Column(name = "is_api_sourced")
    private Boolean apiSourced = false;

    // Original API ID if sourced from API (for reference)
    @Column
    private String apiId;

    // Safe getter to handle null values
    public boolean isApiSourced() {
        return apiSourced != null ? apiSourced : false;
    }

    // Safe setter to handle null values
    public void setApiSourced(Boolean apiSourced) {
        this.apiSourced = apiSourced != null ? apiSourced : false;
    }

    // Safe getter for availableSeats
    public int getAvailableSeats() {
        return availableSeats != null ? availableSeats : 0;
    }

    // Safe setter for availableSeats
    public void setAvailableSeats(Integer availableSeats) {
        this.availableSeats = availableSeats != null ? availableSeats : 0;
    }

    @JsonManagedReference  // This stays as JsonManagedReference
    @OneToMany(mappedBy = "flight", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Seat> seats = new ArrayList<>();

    // Helper method to add a seat
    public void addSeat(Seat seat) {
        seats.add(seat);
        seat.setFlight(this);
    }

    // Helper method to remove a seat
    public void removeSeat(Seat seat) {
        seats.remove(seat);
        seat.setFlight(null);
    }

    // Getters and setters for originState
    public String getOriginState() {
        return originState;
    }
    
    public void setOriginState(String originState) {
        this.originState = originState;
    }
    
    // Getters and setters for destinationState
    public String getDestinationState() {
        return destinationState;
    }
    
    public void setDestinationState(String destinationState) {
        this.destinationState = destinationState;
    }
}