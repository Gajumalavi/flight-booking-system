package com.example.ticket_booking_backend.dto;

import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.Passenger;
import com.example.ticket_booking_backend.model.Seat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingDTO {
    private Long id;
    private Long flightId;
    private Long userId;
    private List<Long> seatIds;
    private LocalDateTime createdAt;
    private String timestamp;
    private String status;
    private List<PassengerDTO> passengers;
    
    // Add flight details
    private String flightNumber;
    private String origin;
    private String originCity;
    private String originName;
    private String destination;
    private String destinationCity;
    private String destinationName;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private Double price;
    private String airline;
    private String flightStatus;

    public BookingDTO(Long id, Long flightId, Long userId, List<Long> seatIds, LocalDateTime createdAt) {
        this.id = id;
        this.flightId = flightId;
        this.userId = userId;
        this.seatIds = seatIds;
        this.createdAt = createdAt;
        this.timestamp = createdAt.toString();
        this.status = "confirmed";
    }

    public static BookingDTO fromBooking(Booking booking) {
        BookingDTO dto = new BookingDTO();
        dto.setId(booking.getId());
        dto.setFlightId(booking.getFlight().getId());
        dto.setUserId(booking.getUser().getId());
        dto.setSeatIds(booking.getSeats().stream()
                .map(Seat::getId)
                .collect(Collectors.toList()));
        dto.setCreatedAt(booking.getBookingTime());
        dto.setTimestamp(booking.getBookingTime().toString());
        dto.setStatus(booking.getStatus().toString().toLowerCase());
        
        // Add flight details to the DTO
        dto.setFlightNumber(booking.getFlight().getFlightNumber());
        dto.setOrigin(booking.getFlight().getOrigin());
        dto.setDestination(booking.getFlight().getDestination());
        dto.setDepartureTime(booking.getFlight().getDepartureTime());
        dto.setArrivalTime(booking.getFlight().getArrivalTime());
        dto.setPrice(booking.getFlight().getPrice());
        dto.setAirline(booking.getFlight().getAirline());
        dto.setFlightStatus(booking.getFlight().getStatus().toString());
        
        // Add airport details
        dto.setOriginCity(booking.getFlight().getOriginCity());
        dto.setOriginName(booking.getFlight().getOriginName());
        dto.setDestinationCity(booking.getFlight().getDestinationCity());
        dto.setDestinationName(booking.getFlight().getDestinationName());
        
        // Convert passengers if they exist
        if (booking.getPassengers() != null && !booking.getPassengers().isEmpty()) {
            dto.setPassengers(booking.getPassengers().stream()
                    .map(PassengerDTO::fromPassenger)
                    .collect(Collectors.toList()));
        }
        
        return dto;
    }
} 