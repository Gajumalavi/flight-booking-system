package com.example.ticket_booking_backend.dto.amadeus;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
public class AmadeusTokenResponse {
    @JsonProperty("access_token")
    private String accessToken;
    
    @JsonProperty("expires_in")
    private int expiresIn;
    
    private String type;
    
    // Add a timestamp for when the token was received
    private long tokenCreationTimestamp = System.currentTimeMillis();
    
    public boolean isExpired() {
        long currentTime = System.currentTimeMillis();
        long expiryTime = tokenCreationTimestamp + (expiresIn * 1000);
        return currentTime >= expiryTime;
    }
} 