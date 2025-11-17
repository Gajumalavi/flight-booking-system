package com.example.ticket_booking_backend.util;

import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.Passenger;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.model.User;
import com.itextpdf.text.*;
import com.itextpdf.text.pdf.*;
import com.itextpdf.text.pdf.draw.LineSeparator;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.text.SimpleDateFormat;
import java.util.List;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Component
public class PdfTicketGenerator {
    private static final Logger logger = LoggerFactory.getLogger(PdfTicketGenerator.class);

    public byte[] generateTicket(Booking booking, User user) {
        try {
            logger.info("Starting PDF ticket generation for booking ID: {}", booking.getId());
            Document document = new Document(PageSize.A4);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            
            document.open();
            
            // --- HEADER ---
            addVisualHeader(document, booking);
            
            // --- FLIGHT INFO ---
            addVisualFlightInfo(document, booking);
            
            // --- PASSENGER INFO ---
            addVisualPassengerInfo(document, booking, user);
            
            // --- SEAT & FARE INFO ---
            addVisualSeatInfo(document, booking);
            
            // --- FOOTER ---
            addVisualFooter(document);
            
            document.close();
            logger.info("Successfully generated PDF ticket for booking ID: {}", booking.getId());
            return baos.toByteArray();
            
        } catch (Exception e) {
            logger.error("Failed to generate ticket PDF", e);
            throw new RuntimeException("Failed to generate ticket PDF: " + e.getMessage(), e);
        }
    }
    
    // --- VISUAL HEADER ---
    private void addVisualHeader(Document document, Booking booking) throws DocumentException {
        // Gradient not natively supported, so use a solid color background
        PdfPTable headerTable = new PdfPTable(1);
        headerTable.setWidthPercentage(100);
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(new BaseColor(227, 48, 105)); // #E33069
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(18);
        // Add checkmark and "Booking Confirmed!"
        Font iconFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 28, BaseColor.WHITE);
        Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, BaseColor.WHITE);
        Paragraph p = new Paragraph("\u2714\uFE0F  Booking Confirmed!", iconFont); // Checkmark
        p.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(p);
        Paragraph ref = new Paragraph("Booking Reference: #" + booking.getId(), titleFont);
        ref.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(ref);
        headerTable.addCell(cell);
        document.add(headerTable);
        document.add(Chunk.NEWLINE);
    }
    
    // --- VISUAL FLIGHT INFO ---
    private void addVisualFlightInfo(Document document, Booking booking) throws DocumentException {
        Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, BaseColor.WHITE);
        PdfPTable sectionHeader = new PdfPTable(1);
        sectionHeader.setWidthPercentage(100);
        PdfPCell shCell = new PdfPCell(new Phrase("\u2708\uFE0F  Flight Information", sectionFont)); // Airplane icon
        shCell.setBackgroundColor(new BaseColor(156, 39, 176)); // #9C27B0
        shCell.setBorder(Rectangle.NO_BORDER);
        shCell.setPadding(8);
        sectionHeader.addCell(shCell);
        document.add(sectionHeader);
        document.add(Chunk.NEWLINE);

        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, BaseColor.BLACK);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 12, BaseColor.BLACK);
        Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, BaseColor.DARK_GRAY);
        Font chipFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, BaseColor.WHITE);

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4);
        table.setSpacingAfter(4);
        
        // Departure
        table.addCell(createCell("Departure", labelFont, true, new BaseColor(240,240,240)));
        
        String origin = "-";
        String originCity = "";
        String originState = "";
        String originAirport = "";
        
        if (booking.getFlight() != null && booking.getFlight().getOrigin() != null) {
            origin = booking.getFlight().getOrigin();
            originCity = booking.getFlight().getOriginCity() != null ? booking.getFlight().getOriginCity() : "";
            originState = booking.getFlight().getOriginState() != null ? booking.getFlight().getOriginState() : "";
            originAirport = booking.getFlight().getOriginName() != null ? booking.getFlight().getOriginName() : "";
        }
        
        PdfPCell originCell = new PdfPCell();
        originCell.setBorder(Rectangle.NO_BORDER);
        originCell.setBackgroundColor(BaseColor.WHITE);
        originCell.setPadding(5);
        
        Paragraph originPara = new Paragraph();
        originPara.add(new Chunk(origin + (originCity.isEmpty() ? "" : " - " + originCity + 
                (originState.isEmpty() ? "" : ", " + originState)), valueFont));
        if (!originAirport.isEmpty()) {
            originPara.add(Chunk.NEWLINE);
            originPara.add(new Chunk(originAirport, subtitleFont));
        }
        originCell.addElement(originPara);
        table.addCell(originCell);
        
        // Arrival
        table.addCell(createCell("Arrival", labelFont, true, new BaseColor(240,240,240)));
        
        String destination = "-";
        String destinationCity = "";
        String destinationState = "";
        String destinationAirport = "";
        
        if (booking.getFlight() != null && booking.getFlight().getDestination() != null) {
            destination = booking.getFlight().getDestination();
            destinationCity = booking.getFlight().getDestinationCity() != null ? booking.getFlight().getDestinationCity() : "";
            destinationState = booking.getFlight().getDestinationState() != null ? booking.getFlight().getDestinationState() : "";
            destinationAirport = booking.getFlight().getDestinationName() != null ? booking.getFlight().getDestinationName() : "";
        }
        
        PdfPCell destinationCell = new PdfPCell();
        destinationCell.setBorder(Rectangle.NO_BORDER);
        destinationCell.setBackgroundColor(BaseColor.WHITE);
        destinationCell.setPadding(5);
        
        Paragraph destinationPara = new Paragraph();
        destinationPara.add(new Chunk(destination + (destinationCity.isEmpty() ? "" : " - " + destinationCity + 
                (destinationState.isEmpty() ? "" : ", " + destinationState)), valueFont));
        if (!destinationAirport.isEmpty()) {
            destinationPara.add(Chunk.NEWLINE);
            destinationPara.add(new Chunk(destinationAirport, subtitleFont));
        }
        destinationCell.addElement(destinationPara);
        table.addCell(destinationCell);
        
        // Date/Time
        table.addCell(createCell("Departure Time", labelFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell(formatDateTime(booking.getFlight() != null ? booking.getFlight().getDepartureTime() : null), valueFont, false, BaseColor.WHITE));
        table.addCell(createCell("Arrival Time", labelFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell(formatDateTime(booking.getFlight() != null ? booking.getFlight().getArrivalTime() : null), valueFont, false, BaseColor.WHITE));
        // Flight Number
        table.addCell(createCell("Flight", labelFont, true, new BaseColor(240,240,240)));
        String flightNumber = booking.getFlight() != null && booking.getFlight().getFlightNumber() != null ? (booking.getFlight().getAirline() != null ? booking.getFlight().getAirline() + " " : "") + booking.getFlight().getFlightNumber() : "-";
        table.addCell(createCell(flightNumber, valueFont, false, BaseColor.WHITE));
        // Class
        table.addCell(createCell("Class", labelFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell("Economy", valueFont, false, new BaseColor(232, 240, 254)));
        // Duration
        table.addCell(createCell("Duration", labelFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell(formatDuration(booking), valueFont, false, BaseColor.WHITE));
        // Booking ID
        table.addCell(createCell("Booking ID", labelFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell(String.valueOf(booking.getId()), valueFont, false, BaseColor.WHITE));
        // Booking Status
        table.addCell(createCell("Booking Status", labelFont, true, new BaseColor(240,240,240)));
        BaseColor statusColor = new BaseColor(76, 175, 80); // Green for confirmed
        table.addCell(createCellChip(booking.getStatus() != null ? booking.getStatus().name() : "-", chipFont, statusColor));
        document.add(table);
        document.add(Chunk.NEWLINE);
    }
    
    // --- VISUAL PASSENGER INFO ---
    private void addVisualPassengerInfo(Document document, Booking booking, User user) throws DocumentException {
        Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, BaseColor.WHITE);
        PdfPTable sectionHeader = new PdfPTable(1);
        sectionHeader.setWidthPercentage(100);
        PdfPCell shCell = new PdfPCell(new Phrase("\uD83D\uDC64  Passenger Information", sectionFont)); // Person icon
        shCell.setBackgroundColor(new BaseColor(156, 39, 176));
        shCell.setBorder(Rectangle.NO_BORDER);
        shCell.setPadding(8);
        sectionHeader.addCell(shCell);
        document.add(sectionHeader);
        document.add(Chunk.NEWLINE);

        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, BaseColor.BLACK);
        Font contentFont = FontFactory.getFont(FontFactory.HELVETICA, 11, BaseColor.BLACK);
        PdfPTable table = new PdfPTable(6);
        table.setWidthPercentage(100);
        // Alternating row colors
        BaseColor[] rowColors = {BaseColor.WHITE, new BaseColor(245, 245, 245)};
        int rowIdx = 0;
        table.addCell(createCell("Name", headerFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell("Email", headerFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell("Phone", headerFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell("Age", headerFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell("Seat", headerFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell("Primary", headerFont, true, new BaseColor(240,240,240)));
        List<Passenger> passengers = booking.getPassengers();
        if (passengers != null && !passengers.isEmpty()) {
            for (int i = 0; i < passengers.size(); i++) {
                Passenger p = passengers.get(i);
                BaseColor rowColor = rowColors[rowIdx % 2];
                table.addCell(createCell(p.getFirstName() + " " + p.getLastName(), contentFont, false, rowColor));
                table.addCell(createCell(p.getEmail() != null ? p.getEmail() : "-", contentFont, false, rowColor));
                table.addCell(createCell(p.getPhone() != null ? p.getPhone() : "-", contentFont, false, rowColor));
                table.addCell(createCell(p.getAge() != null ? String.valueOf(p.getAge()) : "-", contentFont, false, rowColor));
                table.addCell(createCell(p.getSeat() != null && p.getSeat().getSeatNumber() != null ? p.getSeat().getSeatNumber() : "-", contentFont, false, rowColor));
                table.addCell(createCell(i == 0 ? "Yes" : "", contentFont, false, rowColor));
                rowIdx++;
            }
        } else {
            table.addCell(createCell(user.getFirstName() + " " + user.getLastName(), contentFont, false, rowColors[0]));
            table.addCell(createCell(user.getEmail() != null ? user.getEmail() : "-", contentFont, false, rowColors[0]));
            table.addCell(createCell(user.getPhone() != null ? user.getPhone() : "-", contentFont, false, rowColors[0]));
            table.addCell(createCell("-", contentFont, false, rowColors[0]));
            table.addCell(createCell("-", contentFont, false, rowColors[0]));
            table.addCell(createCell("Yes", contentFont, false, rowColors[0]));
        }
        document.add(table);
        document.add(Chunk.NEWLINE);
    }
    
    // --- VISUAL SEAT & FARE INFO ---
    private void addVisualSeatInfo(Document document, Booking booking) throws DocumentException {
        Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, BaseColor.WHITE);
        PdfPTable sectionHeader = new PdfPTable(1);
        sectionHeader.setWidthPercentage(100);
        PdfPCell shCell = new PdfPCell(new Phrase("\uD83D\uDCBA  Seat & Fare Details", sectionFont)); // Seat icon
        shCell.setBackgroundColor(new BaseColor(255, 127, 35)); // #FF7F23
        shCell.setBorder(Rectangle.NO_BORDER);
        shCell.setPadding(8);
        sectionHeader.addCell(shCell);
        document.add(sectionHeader);
        document.add(Chunk.NEWLINE);

        Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, BaseColor.BLACK);
        Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 12, BaseColor.BLACK);
        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        table.setSpacingBefore(4);
        table.setSpacingAfter(4);
        List<Seat> seats = booking.getSeats();
        table.addCell(createCell("Number of Seats", labelFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell(String.valueOf(seats != null ? seats.size() : 0), valueFont, false, BaseColor.WHITE));
        table.addCell(createCell("Seat Numbers", labelFont, true, new BaseColor(240,240,240)));
        String seatNumbers = seats != null && !seats.isEmpty() ? seats.stream().map(s -> s.getSeatNumber()).collect(Collectors.joining(", ")) : "-";
        table.addCell(createCell(seatNumbers, valueFont, false, BaseColor.WHITE));
        double price = booking.getFlight() != null ? booking.getFlight().getPrice() : 0.0;
        table.addCell(createCell("Base fare (per seat)", labelFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell("\u20B9" + String.format("%.0f", price), valueFont, false, new BaseColor(232, 240, 254)));
        table.addCell(createCell("Total amount", labelFont, true, new BaseColor(240,240,240)));
        table.addCell(createCell("\u20B9" + String.format("%.0f", price * (seats != null ? seats.size() : 0)), valueFont, false, new BaseColor(255, 249, 196)));
        document.add(table);
        document.add(Chunk.NEWLINE);
    }
    
    // --- VISUAL FOOTER ---
    private void addVisualFooter(Document document) throws DocumentException {
        // Colored divider
        LineSeparator ls = new LineSeparator();
        ls.setLineColor(new BaseColor(156, 39, 176));
        document.add(new Chunk(ls));
        document.add(Chunk.NEWLINE);
        // Boarding note
        Font noteFont = FontFactory.getFont(FontFactory.HELVETICA, 10, BaseColor.DARK_GRAY);
        noteFont.setStyle(Font.ITALIC);
        Paragraph boardingNote = new Paragraph(
                "Please arrive at the airport at least 2 hours before the scheduled departure time. " +
                "Please present this ticket along with a valid photo ID at the check-in counter.",
                noteFont);
        document.add(boardingNote);
        document.add(Chunk.NEWLINE);
        // Verification code in colored box
        Font barcodeNote = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, BaseColor.WHITE);
        PdfPTable codeTable = new PdfPTable(1);
        codeTable.setWidthPercentage(60);
        PdfPCell codeCell = new PdfPCell(new Phrase("Booking verification code: " + generateVerificationCode(8), barcodeNote));
        codeCell.setBackgroundColor(new BaseColor(76, 175, 80));
        codeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        codeCell.setBorder(Rectangle.NO_BORDER);
        codeCell.setPadding(8);
        codeTable.setHorizontalAlignment(Element.ALIGN_CENTER);
        codeTable.addCell(codeCell);
        document.add(codeTable);
        document.add(Chunk.NEWLINE);
        // Footer note
        Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 8, BaseColor.GRAY);
        Paragraph footer = new Paragraph("This is an electronic ticket. © 2024 Flight Booking System.", footerFont);
        footer.setAlignment(Element.ALIGN_CENTER);
        document.add(footer);
    }
    
    // --- HELPER METHODS ---
    private PdfPCell createCell(String content, Font font, boolean isHeader, BaseColor bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(content, font));
        cell.setPadding(7);
        cell.setBackgroundColor(bgColor);
        if (isHeader) {
            cell.setBorderWidthBottom(2f);
        }
        return cell;
    }
    private PdfPCell createCellChip(String content, Font font, BaseColor bgColor) {
        PdfPCell cell = new PdfPCell(new Phrase(content, font));
        cell.setPadding(7);
        cell.setBackgroundColor(bgColor);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(bgColor.darker());
        cell.setBorderWidth(1.5f);
        return cell;
    }
    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) return "N/A";
        Date date = Date.from(dateTime.atZone(ZoneId.systemDefault()).toInstant());
        SimpleDateFormat dateFormat = new SimpleDateFormat("EEE, dd MMM yyyy hh:mm a");
        return dateFormat.format(date);
    }
    private String formatDuration(Booking booking) {
        try {
            if (booking.getFlight() != null && booking.getFlight().getDepartureTime() != null && booking.getFlight().getArrivalTime() != null) {
                LocalDateTime dep = booking.getFlight().getDepartureTime();
                LocalDateTime arr = booking.getFlight().getArrivalTime();
                long minutes = java.time.Duration.between(dep, arr).toMinutes();
                return (minutes / 60) + "h " + (minutes % 60) + "m";
            }
        } catch (Exception e) {
            // ignore
        }
        return "-";
    }
    private String generateVerificationCode(int length) {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < length; i++) {
            int index = (int) (Math.random() * characters.length());
            code.append(characters.charAt(index));
        }
        return code.toString();
    }
} 