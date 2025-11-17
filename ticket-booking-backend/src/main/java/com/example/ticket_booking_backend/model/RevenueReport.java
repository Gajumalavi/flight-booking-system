package com.example.ticket_booking_backend.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
public class RevenueReport {
    // Daily Revenue
    private LocalDate date;
    private BigDecimal dailyTotalRevenue;
    private int dailyTotalBookings;
    private Map<String, BigDecimal> dailyRevenueByRoute;
    private Map<String, Integer> dailyBookingsByRoute;
    private BigDecimal dailyAverageBookingValue;

    // Monthly/Annual Revenue
    private String period; // "MONTHLY" or "ANNUAL"
    private int year;
    private int month; // 1-12 for monthly reports
    private BigDecimal periodTotalRevenue;
    private int periodTotalBookings;
    private Map<String, BigDecimal> revenueByMonth;
    private Map<String, Integer> bookingsByMonth;
    private Map<String, BigDecimal> periodRevenueByRoute;
    private Map<String, Integer> periodBookingsByRoute;
    private BigDecimal periodAverageBookingValue;
    private BigDecimal revenueGrowth; // Percentage growth compared to previous period
} 