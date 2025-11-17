package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.model.BookingReport;
import com.example.ticket_booking_backend.model.FlightReport;
import com.example.ticket_booking_backend.model.RevenueReport;
import com.example.ticket_booking_backend.service.ReportService;
import com.example.ticket_booking_backend.service.BookingService;
import com.example.ticket_booking_backend.service.FlightService;
import com.example.ticket_booking_backend.service.RevenueService;
import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.Flight;
import com.example.ticket_booking_backend.model.BookingReportFilter;
import com.example.ticket_booking_backend.model.FlightReportFilter;
import com.example.ticket_booking_backend.model.RevenueReportFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import net.sf.jasperreports.engine.JRException;
import java.io.FileNotFoundException;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    @Autowired
    private ReportService reportService;
    @Autowired
    private BookingService bookingService;
    @Autowired
    private FlightService flightService;
    @Autowired
    private RevenueService revenueService;

    @PostMapping("/booking/{reportType}")
    public ResponseEntity<byte[]> generateBookingReport(
            @PathVariable String reportType,
            @RequestBody BookingReportFilter filter) throws FileNotFoundException, JRException {
        List<Booking> bookings = bookingService.findBookingsByDateRange(filter.getStartDate(), filter.getEndDate());
        List<BookingReport> reportData = bookings.stream().map(BookingReport::fromBooking).collect(Collectors.toList());
        byte[] reportContent = reportService.generateBookingReport(reportData, reportType);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", "booking-report.pdf");
        return ResponseEntity.ok().headers(headers).body(reportContent);
    }

    @PostMapping("/flight/{reportType}")
    public ResponseEntity<byte[]> generateFlightReport(
            @PathVariable String reportType,
            @RequestBody FlightReportFilter filter) throws FileNotFoundException, JRException {
        FlightReport report = flightService.generateFlightReport(filter);
        byte[] reportContent = reportService.generateFlightReport(report, reportType);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", "flight-report.pdf");
        return ResponseEntity.ok().headers(headers).body(reportContent);
    }

    @PostMapping("/revenue/{reportType}")
    public ResponseEntity<byte[]> generateRevenueReport(
            @PathVariable String reportType,
            @RequestBody RevenueReportFilter filter) throws FileNotFoundException, JRException {
        RevenueReport report = revenueService.generateRevenueReport(filter);
        byte[] reportContent = reportService.generateRevenueReport(report, reportType);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", "revenue-report.pdf");
        return ResponseEntity.ok().headers(headers).body(reportContent);
    }
} 