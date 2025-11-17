package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.RevenueReport;
import com.example.ticket_booking_backend.model.RevenueReportFilter;
import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.repository.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;

@Service
public class RevenueService {
    @Autowired
    private BookingRepository bookingRepository;

    public RevenueReport generateRevenueReport(RevenueReportFilter filter) {
        RevenueReport report = new RevenueReport();
        try {
            LocalDate start = LocalDate.parse(filter.getStartDate());
            LocalDate end = LocalDate.parse(filter.getEndDate());
            LocalDateTime startDateTime = start.atStartOfDay();
            LocalDateTime endDateTime = end.atTime(23, 59, 59);
            String period = filter.getPeriod();

            List<Booking> bookings = bookingRepository.findByBookingTimeBetween(startDateTime, endDateTime);

            BigDecimal totalRevenue = BigDecimal.ZERO;
            int totalBookings = 0;
            HashMap<String, BigDecimal> revenueByRoute = new HashMap<>();
            HashMap<String, Integer> bookingsByRoute = new HashMap<>();
            HashMap<String, BigDecimal> revenueByMonth = new HashMap<>();
            HashMap<String, Integer> bookingsByMonth = new HashMap<>();
            BigDecimal totalBookingValue = BigDecimal.ZERO;

            DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("yyyy-MM");
            DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");

            for (Booking b : bookings) {
                BigDecimal price = BigDecimal.valueOf(b.getFlight().getPrice());
                totalRevenue = totalRevenue.add(price);
                totalBookings++;
                totalBookingValue = totalBookingValue.add(price);
                String route = b.getFlight().getOrigin() + "-" + b.getFlight().getDestination();
                revenueByRoute.put(route, revenueByRoute.getOrDefault(route, BigDecimal.ZERO).add(price));
                bookingsByRoute.put(route, bookingsByRoute.getOrDefault(route, 0) + 1);
                String monthKey = period.equals("DAILY") ? b.getBookingTime().format(dayFmt) : b.getBookingTime().format(monthFmt);
                revenueByMonth.put(monthKey, revenueByMonth.getOrDefault(monthKey, BigDecimal.ZERO).add(price));
                bookingsByMonth.put(monthKey, bookingsByMonth.getOrDefault(monthKey, 0) + 1);
            }

            report.setPeriod(period);
            report.setPeriodTotalRevenue(totalRevenue);
            report.setPeriodTotalBookings(totalBookings);
            report.setPeriodRevenueByRoute(revenueByRoute);
            report.setPeriodBookingsByRoute(bookingsByRoute);
            report.setRevenueByMonth(revenueByMonth);
            report.setBookingsByMonth(bookingsByMonth);
            report.setPeriodAverageBookingValue(totalBookings > 0 ? totalBookingValue.divide(BigDecimal.valueOf(totalBookings), 2, BigDecimal.ROUND_HALF_UP) : BigDecimal.ZERO);
            // Revenue growth calculation (simple: compare to previous period)
            // For demo, set to 0 or N/A
            report.setRevenueGrowth(BigDecimal.ZERO);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate revenue report: " + e.getMessage(), e);
        }
        return report;
    }
} 