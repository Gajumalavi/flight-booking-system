package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.BookingReport;
import com.example.ticket_booking_backend.model.FlightReport;
import com.example.ticket_booking_backend.model.RevenueReport;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.ResourceUtils;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportService {

    private static final Logger logger = LoggerFactory.getLogger(ReportService.class);

    public byte[] generateBookingReport(List<BookingReport> bookings, String reportType) {
        try {
            File file = ResourceUtils.getFile("classpath:reports/booking_report.jrxml");
            JasperReport jasperReport = JasperCompileManager.compileReport(file.getAbsolutePath());
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(bookings);
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("reportType", reportType);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (Exception e) {
            logger.error("Error generating booking report: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate booking report: " + e.getMessage(), e);
        }
    }

    public byte[] generateFlightReport(FlightReport report, String reportType) throws FileNotFoundException, JRException {
        File file = ResourceUtils.getFile("classpath:reports/flight_report.jrxml");
        JasperReport jasperReport = JasperCompileManager.compileReport(file.getAbsolutePath());
        
        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(List.of(report));
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("reportType", reportType);
        
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    public byte[] generateRevenueReport(RevenueReport report, String reportType) throws FileNotFoundException, JRException {
        File file = ResourceUtils.getFile("classpath:reports/revenue_report.jrxml");
        JasperReport jasperReport = JasperCompileManager.compileReport(file.getAbsolutePath());
        
        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(List.of(report));
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("reportType", reportType);
        
        JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }
} 