package com.example.ticket_booking_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import com.example.ticket_booking_backend.service.WebSocketService;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketConfig.class);
    
    // Track client IDs and their subscribed flight IDs
    private final Map<String, Long> clientSubscriptions = new ConcurrentHashMap<>();
    
    // Use ApplicationContext for lazy lookup instead of direct dependency injection
    private final ApplicationContext applicationContext;

    public WebSocketConfig(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    @Bean(name = "webSocketHeartbeatTaskScheduler")
    public TaskScheduler webSocketHeartbeatTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("wss-heartbeat-");
        scheduler.initialize();
        return scheduler;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[] {10000, 10000}) // Set heartbeat for both server and client
                .setTaskScheduler(webSocketHeartbeatTaskScheduler()); // Set the task scheduler for heartbeats
        registry.setApplicationDestinationPrefixes("/app");
        logger.info("WebSocket message broker configured with heartbeats");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:3000")
                .withSockJS()
                .setDisconnectDelay(30 * 1000)  // 30 seconds disconnect delay
                .setHeartbeatTime(10 * 1000);   // 10 seconds heartbeat
        logger.info("WebSocket endpoints registered with enhanced reconnection settings");
    }

    @EventListener
    public void handleSessionConnected(SessionConnectEvent event) {
        String sessionId = event.getMessage().getHeaders().get("simpSessionId", String.class);
        logger.info("Client connected: {}", sessionId);
    }
    
    @EventListener
    public void handleSessionSubscribeEvent(SessionSubscribeEvent event) {
        String sessionId = event.getMessage().getHeaders().get("simpSessionId", String.class);
        String destination = event.getMessage().getHeaders().get("simpDestination", String.class);
        
        // Parse the flight ID from subscription pattern: /topic/flight/{flightId}/seats
        if (destination != null && destination.contains("/topic/flight/") && destination.contains("/seats")) {
            try {
                String[] parts = destination.split("/");
                if (parts.length >= 4) {
                    Long flightId = Long.parseLong(parts[3]);
                    clientSubscriptions.put(sessionId, flightId);
                    logger.info("Client {} subscribed to flight {}", sessionId, flightId);
                }
            } catch (NumberFormatException e) {
                logger.warn("Could not parse flight ID from destination: {}", destination);
            }
        }
    }

    @EventListener
    public void handleSessionDisconnect(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        logger.info("Client disconnected: {}", sessionId);
        
        // Check if this client had any seat subscriptions
        Long flightId = clientSubscriptions.remove(sessionId);
        if (flightId != null) {
            // Get the WebSocketService bean lazily to avoid circular dependency
            try {
                WebSocketService webSocketService = applicationContext.getBean(WebSocketService.class);
                // Notify the service that the client disconnected
                webSocketService.handleClientDisconnect(sessionId, flightId);
                logger.info("Notified WebSocketService about client {} disconnection from flight {}", 
                        sessionId, flightId);
            } catch (Exception e) {
                logger.error("Could not notify WebSocketService about client disconnection: {}", e.getMessage());
            }
        }
    }
}