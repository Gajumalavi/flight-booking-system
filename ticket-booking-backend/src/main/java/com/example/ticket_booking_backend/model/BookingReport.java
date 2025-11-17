package com.example.ticket_booking_backend.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class BookingReport {
    private String bookingId;
    private String customerName;
    private String customerEmail;
    private String flightNumber;
    private String fromCity;
    private String toCity;
    private LocalDateTime departureTime;
    private LocalDateTime arrivalTime;
    private String seatNumbers;
    private BigDecimal amount;
    private String paymentStatus;
    private LocalDateTime bookingDate;
    private String status;

    public static BookingReport fromBooking(Booking booking) {
        BookingReport report = new BookingReport();
        report.setBookingId(String.valueOf(booking.getId()));
        report.setCustomerName(booking.getUser().getFirstName() + " " + booking.getUser().getLastName());
        report.setCustomerEmail(booking.getUser().getEmail());
        report.setFlightNumber(booking.getFlight().getFlightNumber());
        report.setFromCity(booking.getFlight().getOrigin());
        report.setToCity(booking.getFlight().getDestination());
        report.setDepartureTime(booking.getFlight().getDepartureTime());
        report.setArrivalTime(booking.getFlight().getArrivalTime());
        report.setSeatNumbers(booking.getSeats() != null ? booking.getSeats().stream().map(s -> s.getSeatNumber()).reduce((a, b) -> a + ", " + b).orElse("") : "");
        report.setAmount(java.math.BigDecimal.valueOf(booking.getFlight().getPrice()));
        report.setPaymentStatus(booking.getStatus().name());
        report.setBookingDate(booking.getBookingTime());
        report.setStatus(booking.getStatus().name());
        return report;
    }
} 