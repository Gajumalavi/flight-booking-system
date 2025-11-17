package com.example.ticket_booking_backend.dto;

import java.util.List;

public class BookingCreateRequest {
    private String flightId;
    private List<Long> seatIds;
    private List<PassengerInfo> passengers;

    public BookingCreateRequest() {
    }

    public BookingCreateRequest(String flightId, List<Long> seatIds, List<PassengerInfo> passengers) {
        this.flightId = flightId;
        this.seatIds = seatIds;
        this.passengers = passengers;
    }

    public String getFlightId() {
        return flightId;
    }

    public void setFlightId(String flightId) {
        this.flightId = flightId;
    }

    public List<Long> getSeatIds() {
        return seatIds;
    }

    public void setSeatIds(List<Long> seatIds) {
        this.seatIds = seatIds;
    }

    public List<PassengerInfo> getPassengers() {
        return passengers;
    }

    public void setPassengers(List<PassengerInfo> passengers) {
        this.passengers = passengers;
    }
    
    // Inner class for passenger information
    public static class PassengerInfo {
        private String firstName;
        private String lastName;
        private String email;
        private String phone;
        private Integer age;
        private Long seatId;
        
        public PassengerInfo() {
        }
        
        public PassengerInfo(String firstName, String lastName, String email, String phone, Integer age, Long seatId) {
            this.firstName = firstName;
            this.lastName = lastName;
            this.email = email;
            this.phone = phone;
            this.age = age;
            this.seatId = seatId;
        }
        
        public String getFirstName() {
            return firstName;
        }
        
        public void setFirstName(String firstName) {
            this.firstName = firstName;
        }
        
        public String getLastName() {
            return lastName;
        }
        
        public void setLastName(String lastName) {
            this.lastName = lastName;
        }
        
        public String getEmail() {
            return email;
        }
        
        public void setEmail(String email) {
            this.email = email;
        }
        
        public String getPhone() {
            return phone;
        }
        
        public void setPhone(String phone) {
            this.phone = phone;
        }
        
        public Integer getAge() {
            return age;
        }
        
        public void setAge(Integer age) {
            this.age = age;
        }
        
        public Long getSeatId() {
            return seatId;
        }
        
        public void setSeatId(Long seatId) {
            this.seatId = seatId;
        }
    }
} 