package com.example.ticket_booking_backend.model;

import lombok.Data;

@Data
public class FlightReportFilter {
    private String origin;
    private String destination;
    private String startDate;
    private String endDate;
} 