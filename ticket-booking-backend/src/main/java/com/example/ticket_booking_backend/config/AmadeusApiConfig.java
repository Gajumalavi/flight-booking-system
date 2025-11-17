package com.example.ticket_booking_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Getter;
import lombok.Setter;

@Configuration
@ConfigurationProperties(prefix = "amadeus.api")
@Getter
@Setter
public class AmadeusApiConfig {
    private String key;
    private String secret;
    private String baseUrl;
    private String tokenUrl;
    private String flightSearchUrl;
} 