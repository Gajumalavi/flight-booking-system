package com.example.ticket_booking_backend.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Data
public class FlightReport {
    // Search Analytics
    private int totalSearches;
    private Map<String, Integer> popularRoutes;
    private Map<String, BigDecimal> averagePrices;
    private Map<String, Integer> searchFrequency;

    // Route Popularity
    private String route;
    private int searchCount;
    private int bookingCount;
    private double conversionRate;
    private Map<String, Integer> searchDistribution;

    // Price Analysis
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private BigDecimal averagePrice;
    private Map<String, BigDecimal> priceByDate;
    private Map<String, BigDecimal> priceByDayOfWeek;
} 