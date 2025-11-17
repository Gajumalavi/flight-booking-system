package com.example.ticket_booking_backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.context.event.EventListener;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;

/**
 * Service for tracking WebSocket sessions and managing reconnections
 */
@Service
public class WebSocketSessionService {
    private static final Logger logger = Logger.getLogger(WebSocketSessionService.class.getName());
    
    // Map to track active sessions by session ID
    private final Map<String, WebSocketSession> activeSessions = new ConcurrentHashMap<>();
    
    // Map to track user-specific data (like which flight they're viewing)
    private final Map<String, UserSessionData> userSessionData = new ConcurrentHashMap<>();
    
    /**
     * Handle new WebSocket connections
     */
    @EventListener
    public void handleSessionConnected(SessionConnectedEvent event) {
        String sessionId = event.getMessage().getHeaders().get("simpSessionId", String.class);
        
        if (sessionId != null) {
            logger.info("New WebSocket session connected: " + sessionId);
            
            // Store session info
            WebSocketSession session = new WebSocketSession(sessionId, null);
            activeSessions.put(sessionId, session);
        }
    }
    
    /**
     * Handle WebSocket disconnections
     */
    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        
        if (sessionId != null) {
            logger.info("WebSocket session disconnected: " + sessionId);
            
            WebSocketSession session = activeSessions.remove(sessionId);
            if (session != null && session.getUserId() != null) {
                // Keep user data for potential reconnection
                logger.info("Keeping session data for user: " + session.getUserId() + " for reconnection");
            }
        }
    }
    
    /**
     * Store user-specific data (like which flight they're viewing)
     */
    public void storeUserData(String userId, String flightId) {
        UserSessionData data = userSessionData.computeIfAbsent(userId, id -> new UserSessionData());
        data.setCurrentFlightId(flightId);
        logger.info("Stored user data for: " + userId + ", current flight: " + flightId);
    }
    
    /**
     * Get user-specific data
     */
    public UserSessionData getUserData(String userId) {
        return userSessionData.get(userId);
    }
    
    // Inner classes for tracking sessions
    
    static class WebSocketSession {
        private final String sessionId;
        private final String userId;
        private final long connectedAt;
        
        public WebSocketSession(String sessionId, String userId) {
            this.sessionId = sessionId;
            this.userId = userId;
            this.connectedAt = System.currentTimeMillis();
        }
        
        public String getSessionId() {
            return sessionId;
        }
        
        public String getUserId() {
            return userId;
        }
        
        public long getConnectedAt() {
            return connectedAt;
        }
    }
    
    public static class UserSessionData {
        private String currentFlightId;
        private Map<String, Object> additionalData = new ConcurrentHashMap<>();
        
        public String getCurrentFlightId() {
            return currentFlightId;
        }
        
        public void setCurrentFlightId(String currentFlightId) {
            this.currentFlightId = currentFlightId;
        }
        
        public void storeData(String key, Object value) {
            additionalData.put(key, value);
        }
        
        public Object getData(String key) {
            return additionalData.get(key);
        }
    }
}