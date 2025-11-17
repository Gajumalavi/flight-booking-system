package com.example.ticket_booking_backend.model;

import com.example.ticket_booking_backend.dto.SeatUpdateDTO;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "seats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Seat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "seat_number", nullable = false)
    private String seatNumber;

    @Column(name = "available", nullable = false)
    private boolean available = true;
    
    @Column(name = "booked", nullable = false)
    private boolean booked = false;
    
    @Column(name = "reserved", nullable = false)
    private boolean reserved = false;
    
    @Column(name = "hold_until")
    private LocalDateTime holdUntil;
    
    @Column(name = "held_by")
    private Long heldByUserId;

    @JsonBackReference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flight_id", nullable = false)
    private Flight flight;
    
    /**
     * Checks if the seat is currently on hold
     * @return true if the seat is on hold and the hold has not expired
     */
    @Transient
    public boolean isOnHold() {
        return holdUntil != null && holdUntil.isAfter(LocalDateTime.now());
    }
    
    /**
     * Checks if the seat is available (not booked, not reserved, and not on hold)
     * @return true if the seat is available for selection
     */
    @Transient
    public boolean isActuallyAvailable() {
        return available && !booked && !reserved && !isOnHold();
    }

    public SeatUpdateDTO toUpdateDTO(String updateType) {
        return new SeatUpdateDTO(
                this.flight.getId(),
                this.id,
                this.available,
                updateType,
                System.currentTimeMillis()
        );
    }
}