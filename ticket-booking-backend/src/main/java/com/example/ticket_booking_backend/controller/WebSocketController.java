package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.dto.SeatSelectionRequest;
import com.example.ticket_booking_backend.dto.SeatUpdateDTO;
import com.example.ticket_booking_backend.exception.SeatNotAvailableException;
import com.example.ticket_booking_backend.service.SeatService;
import com.example.ticket_booking_backend.service.WebSocketService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;

@Controller
public class WebSocketController {
    
    private static final Logger logger = LoggerFactory.getLogger(WebSocketController.class);
    private final SeatService seatService;
    private final WebSocketService webSocketService;
    private final SimpMessagingTemplate messagingTemplate;
    
    public WebSocketController(SeatService seatService, 
                               WebSocketService webSocketService,
                               SimpMessagingTemplate messagingTemplate) {
        this.seatService = seatService;
        this.webSocketService = webSocketService;
        this.messagingTemplate = messagingTemplate;
        logger.info("WebSocketController initialized");
    }
    
    /**
     * Handles seat selection requests from clients via WebSocket
     * This is being replaced by holdSeat for better user experience
     * Destination: /app/seats/select
     */
    @MessageMapping("/seats/select")
    public void selectSeat(SeatSelectionRequest request) {
        logger.info("Received seat selection request: {}", request);
        try {
            boolean success = seatService.selectSeat(request.getSeatId(), request.getFlightId());
            if (success) {
                // Track this seat selection if we have a user ID
                if (request.getUserId() != null && !request.getUserId().isEmpty()) {
                    webSocketService.trackSeatSelection(request.getUserId(), 
                            request.getSeatId(), request.getFlightId());
                }
            } else {
                // Send error to client if seat couldn't be selected
                sendErrorMessage(request, "Seat selection failed - seat is not available");
            }
        } catch (SeatNotAvailableException e) {
            logger.warn("Seat selection failed: {}", e.getMessage());
            sendErrorMessage(request, e.getMessage());
        } catch (Exception e) {
            logger.error("Error processing seat selection: {}", e.getMessage(), e);
            sendErrorMessage(request, "Internal server error");
        }
    }
    
    /**
     * Handles seat release requests from clients via WebSocket
     * Destination: /app/seats/release
     */
    @MessageMapping("/seats/release")
    public void releaseSeat(SeatSelectionRequest request) {
        logger.info("Received seat release request: {}", request);
        try {
            boolean success = seatService.releaseSeat(request.getSeatId(), request.getFlightId());
            if (success) {
                // Untrack this seat selection if we have a user ID
                if (request.getUserId() != null && !request.getUserId().isEmpty()) {
                    webSocketService.untrackSeatSelection(request.getUserId(), request.getSeatId());
                }
            } else {
                logger.warn("Seat release failed for seat: {} on flight: {}", 
                         request.getSeatId(), request.getFlightId());
                sendErrorMessage(request, "Seat release failed");
            }
        } catch (Exception e) {
            logger.error("Error processing seat release: {}", e.getMessage(), e);
            sendErrorMessage(request, "Internal server error");
        }
    }
    
    /**
     * Handles seat hold requests from clients via WebSocket
     * Destination: /app/seats/hold
     * This places a temporary reservation on a seat with a timeout
     */
    @MessageMapping("/seats/hold")
    public void holdSeat(SeatSelectionRequest request) {
        logger.info("Received seat hold request: {}", request);
        try {
            // Extract user ID from request or security context
            Long userId = null;
            String clientId = request.getUserId();
            
            if (request.getUserId() != null && !request.getUserId().isEmpty()) {
                try {
                    userId = Long.parseLong(request.getUserId());
                } catch (NumberFormatException e) {
                    logger.warn("Invalid user ID format: {}, using as client ID only", request.getUserId());
                }
            }
            
            // If no valid userId in request, try to get from security context
            if (userId == null) {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getPrincipal() instanceof org.springframework.security.core.userdetails.User) {
                    org.springframework.security.core.userdetails.User user = 
                            (org.springframework.security.core.userdetails.User) auth.getPrincipal();
                    if (user.getUsername() != null) {
                        // This is a simplified example - in a real app you'd look up the user ID by username
                        userId = 1L; // Default user ID if not specified
                    }
                }
            }
            
            // Default to a system ID if we still don't have a user ID
            if (userId == null) {
                userId = 999L; // System user ID
            }
            
            boolean success = seatService.holdSeat(request.getSeatId(), request.getFlightId(), userId);
            
            if (success) {
                // Track this seat hold if we have a client ID
                if (clientId != null && !clientId.isEmpty()) {
                    webSocketService.trackSeatSelection(clientId, 
                            request.getSeatId(), request.getFlightId());
                }
            } else {
                sendErrorMessage(request, "Seat hold failed - seat is not available");
            }
        } catch (SeatNotAvailableException e) {
            logger.warn("Seat hold failed: {}", e.getMessage());
            sendErrorMessage(request, e.getMessage());
        } catch (Exception e) {
            logger.error("Error processing seat hold: {}", e.getMessage(), e);
            sendErrorMessage(request, "Internal server error");
        }
    }
    
    /**
     * Sends an error message back to the client via WebSocket
     */
    private void sendErrorMessage(SeatSelectionRequest request, String errorMessage) {
        try {
            String destination = "/user/queue/errors";
            Map<String, Object> errorResponse = Map.of(
                "error", errorMessage,
                "seatId", request.getSeatId(),
                "flightId", request.getFlightId(),
                "timestamp", System.currentTimeMillis()
            );
            
            messagingTemplate.convertAndSend(destination, errorResponse);
            
            // Also send an update through the normal channel to ensure UI state is correct
            webSocketService.notifySeatUpdate(new SeatUpdateDTO(
                request.getFlightId(),
                request.getSeatId(),
                true, // Indicate the seat is actually available
                "ERROR",
                System.currentTimeMillis()
            ));
        } catch (Exception e) {
            logger.error("Failed to send error message: {}", e.getMessage(), e);
        }
    }
}