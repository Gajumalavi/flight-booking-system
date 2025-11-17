package com.example.ticket_booking_backend.model;

import lombok.Data;

@Data
public class RevenueReportFilter {
    private String startDate;
    private String endDate;
    private String period; // DAILY, MONTHLY, ANNUAL
} 