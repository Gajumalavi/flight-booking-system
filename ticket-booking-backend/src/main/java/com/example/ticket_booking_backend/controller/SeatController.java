package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.service.SeatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/seats")
@CrossOrigin(origins = "http://localhost:3000")
public class SeatController {

    private static final Logger logger = LoggerFactory.getLogger(SeatController.class);

    @Autowired
    private SeatService seatService;

    @GetMapping("/available")
    public ResponseEntity<?> getAvailableSeats(@RequestParam Long flightId) {
        try {
            logger.info("Fetching available seats for flight ID: {}", flightId);
            List<Seat> seats = seatService.getAvailableSeats(flightId);
            if (seats.isEmpty()) {
                logger.warn("No available seats found for flight ID: {}", flightId);
                return ResponseEntity.ok().body("No available seats found");
            }
            return ResponseEntity.ok(seats);
        } catch (Exception e) {
            logger.error("Error fetching available seats for flight {}: {}", flightId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to load seats: " + e.getMessage());
        }
    }

    // Add this new endpoint for getting all seats
    @GetMapping("/flight/{flightId}")
    public ResponseEntity<?> getAllSeatsForFlight(@PathVariable Long flightId) {
        try {
            logger.info("Fetching all seats for flight ID: {}", flightId);
            List<Seat> seats = seatService.getAllSeatsForFlight(flightId);
            if (seats.isEmpty()) {
                logger.warn("No seats found for flight ID: {}", flightId);
                return ResponseEntity.ok().body("No seats found for this flight");
            }
            return ResponseEntity.ok(seats);
        } catch (Exception e) {
            logger.error("Error fetching seats for flight {}: {}", flightId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to load seats: " + e.getMessage());
        }
    }

    @PutMapping("/{seatId}/select")
    public ResponseEntity<?> selectSeat(@PathVariable Long seatId, @RequestParam Long flightId) {
        try {
            boolean success = seatService.selectSeat(seatId, flightId);
            if (success) {
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "success", true,
                                "message", "Seat selected successfully",
                                "seatId", seatId
                        ));
            } else {
                return ResponseEntity.badRequest()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "success", false,
                                "message", "Seat is not available"
                        ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "success", false,
                            "message", "Failed to select seat: " + e.getMessage()
                    ));
        }
    }

    @PutMapping("/{seatId}/release")
    public ResponseEntity<?> releaseSeat(@PathVariable Long seatId, @RequestParam Long flightId) {
        try {
            logger.info("Attempting to release seat ID: {} for flight ID: {}", seatId, flightId);
            boolean success = seatService.releaseSeat(seatId, flightId);
            if (success) {
                return ResponseEntity.ok().body("Seat released successfully");
            } else {
                return ResponseEntity.badRequest().body("Unable to release seat");
            }
        } catch (Exception e) {
            logger.error("Error releasing seat {} for flight {}: {}", seatId, flightId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to release seat: " + e.getMessage());
        }
    }

    // Add this new endpoint for booking seats
    @PutMapping("/{seatId}/book")
    public ResponseEntity<?> bookSeat(@PathVariable Long seatId, @RequestParam Long flightId) {
        try {
            logger.info("Attempting to permanently book seat ID: {} for flight ID: {}", seatId, flightId);
            boolean success = seatService.bookSeat(seatId, flightId);
            if (success) {
                return ResponseEntity.ok()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "success", true,
                                "message", "Seat booked successfully",
                                "seatId", seatId
                        ));
            } else {
                return ResponseEntity.badRequest()
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "success", false,
                                "message", "Unable to book seat"
                        ));
            }
        } catch (Exception e) {
            logger.error("Error booking seat {} for flight {}: {}", seatId, flightId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "success", false,
                            "message", "Failed to book seat: " + e.getMessage()
                    ));
        }
    }
}