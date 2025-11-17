package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.dto.SeatUpdateDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.util.logging.Logger;
import java.util.logging.Level;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WebSocketService {
    private static final Logger logger = Logger.getLogger(WebSocketService.class.getName());
    private final SimpMessagingTemplate messagingTemplate;
    private final SeatService seatService;
    
    // Track client sessions by their websocket_user_id and the seats they're holding
    private final Map<String, Set<Long>> clientHeldSeats = new ConcurrentHashMap<>();
    // Track which flight each seat belongs to
    private final Map<Long, Long> seatToFlightMap = new ConcurrentHashMap<>();

    @Autowired
    public WebSocketService(SimpMessagingTemplate messagingTemplate, @Lazy SeatService seatService) {
        this.messagingTemplate = messagingTemplate;
        this.seatService = seatService;
        logger.info("WebSocketService initialized with SeatService");
    }
    
    /**
     * Track a seat selection by a client
     * @param clientId The client's unique ID
     * @param seatId The selected seat ID
     * @param flightId The flight ID
     */
    public void trackSeatSelection(String clientId, Long seatId, Long flightId) {
        if (clientId == null || seatId == null || flightId == null) {
            logger.warning("Cannot track seat selection with null values: clientId=" + 
                    clientId + ", seatId=" + seatId + ", flightId=" + flightId);
            return;
        }
        
        // Get or create the set of seats for this client
        clientHeldSeats.computeIfAbsent(clientId, k -> new HashSet<>()).add(seatId);
        // Remember which flight this seat belongs to
        seatToFlightMap.put(seatId, flightId);
        
        logger.info("Tracking seat " + seatId + " on flight " + flightId + " for client " + clientId);
    }
    
    /**
     * Stop tracking a seat when released
     * @param clientId The client's unique ID
     * @param seatId The seat ID being released
     */
    public void untrackSeatSelection(String clientId, Long seatId) {
        if (clientId == null || seatId == null) {
            return;
        }
        
        // Remove the seat from this client's tracked seats
        Set<Long> clientSeats = clientHeldSeats.get(clientId);
        if (clientSeats != null) {
            clientSeats.remove(seatId);
            if (clientSeats.isEmpty()) {
                clientHeldSeats.remove(clientId);
            }
        }
        
        // Don't remove from seatToFlightMap as other operations might need it
        logger.info("Untracking seat " + seatId + " for client " + clientId);
    }

    /**
     * Send a seat update notification to all connected clients
     * @param seatUpdate The seat update information
     */
    public void notifySeatUpdate(SeatUpdateDTO seatUpdate) {
        try {
            String destination = "/topic/flight/" + seatUpdate.getFlightId() + "/seats";
            logger.info("Sending seat update to " + destination + ": " + seatUpdate);
            
            messagingTemplate.convertAndSend(destination, seatUpdate);
            logger.info("Seat update sent successfully");
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Failed to send seat update: " + e.getMessage(), e);
            // Could implement retry logic here if needed
        }
    }

    /**
     * Overloaded method to notify seat update with individual parameters
     * @param flightId The flight ID
     * @param seatId The seat ID
     * @param isAvailable Whether the seat is available
     * @param status The status message
     * @param timestamp The timestamp of the update
     */
    public void notifySeatUpdate(Long flightId, Long seatId, boolean isAvailable, String status, long timestamp) {
        SeatUpdateDTO seatUpdate = new SeatUpdateDTO(flightId, seatId, isAvailable, status, timestamp);
        notifySeatUpdate(seatUpdate);
    }

    /**
     * Notify clients about general flight updates
     * @param flightId The flight ID
     * @param update The update object
     */
    public void notifyFlightUpdate(Long flightId, Object update) {
        try {
            String destination = "/topic/flight/" + flightId;
            logger.info("Sending flight update to " + destination);
            
            messagingTemplate.convertAndSend(destination, update);
            logger.info("Flight update sent successfully");
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Failed to send flight update: " + e.getMessage(), e);
        }
    }

    /**
     * Send a booking-related seat status update
     * @param flightId The flight ID
     * @param seatId The seat ID
     * @param status The new status (e.g., "BOOKED", "AVAILABLE")
     */
    public void notifyBookingUpdate(Long flightId, Long seatId, String status) {
        try {
            SeatUpdateDTO update = new SeatUpdateDTO(
                flightId,
                seatId,
                status.equals("AVAILABLE"),
                status,
                System.currentTimeMillis()
            );
            notifySeatUpdate(update);
        } catch (Exception e) {
            logger.log(Level.SEVERE, "Failed to send booking update: " + e.getMessage(), e);
        }
    }
    
    /**
     * Handle client disconnection event
     * This is called when a WebSocket client disconnects, which might be due to browser close
     * @param sessionId The WebSocket session ID
     * @param flightId The flight ID the client was subscribed to
     */
    public void handleClientDisconnect(String sessionId, Long flightId) {
        logger.info("Processing client disconnect: " + sessionId + " from flight " + flightId);
        
        // Look for any frontend client IDs that might be associated with this session
        // This is a simplistic approach - in a real system, you'd have a more robust
        // way to map WebSocket sessions to user identities
        clientHeldSeats.forEach((clientId, seatIds) -> {
            // If the client ID contains the session ID (simplified matching)
            if (clientId != null && clientId.contains(sessionId)) {
                logger.info("Found client " + clientId + " associated with session " + sessionId);
                
                // Release all seats held by this client
                Set<Long> seatsToRelease = new HashSet<>(seatIds); // Copy to avoid concurrent modification
                for (Long seatId : seatsToRelease) {
                    Long seatFlightId = seatToFlightMap.get(seatId);
                    if (seatFlightId != null && seatFlightId.equals(flightId)) {
                        logger.info("Auto-releasing seat " + seatId + " for disconnected client " + clientId);
                        try {
                            // Release the seat
                            seatService.releaseSeat(seatId, flightId);
                            
                            // Update our tracking
                            seatIds.remove(seatId);
                        } catch (Exception e) {
                            logger.log(Level.WARNING, "Failed to auto-release seat " + seatId + 
                                    " for disconnected client: " + e.getMessage(), e);
                        }
                    }
                }
                
                // Clean up the tracking if all seats were released
                if (seatIds.isEmpty()) {
                    clientHeldSeats.remove(clientId);
                    logger.info("Removed all seat tracking for disconnected client " + clientId);
                }
            }
        });
    }
}