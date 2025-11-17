package com.example.ticket_booking_backend.dto;

import com.example.ticket_booking_backend.model.Passenger;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PassengerDTO {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private Integer age;
    private Long seatId;
    private String seatNumber;
    
    public static PassengerDTO fromPassenger(Passenger passenger) {
        PassengerDTO dto = new PassengerDTO();
        dto.setId(passenger.getId());
        dto.setFirstName(passenger.getFirstName());
        dto.setLastName(passenger.getLastName());
        dto.setEmail(passenger.getEmail());
        dto.setPhone(passenger.getPhone());
        dto.setAge(passenger.getAge());
        dto.setSeatId(passenger.getSeat().getId());
        dto.setSeatNumber(passenger.getSeat().getSeatNumber());
        return dto;
    }
} 