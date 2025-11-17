package com.example.ticket_booking_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Getter;
import lombok.Setter;

@Configuration
@ConfigurationProperties(prefix = "app.api")
@Getter
@Setter
public class ApiQuotaConfig {
    private int maxCallsPerMonth;
    private int callsThisMonth;
    
    public boolean hasQuotaRemaining() {
        return callsThisMonth < maxCallsPerMonth;
    }
    
    public void incrementCallCount() {
        callsThisMonth++;
    }
} 