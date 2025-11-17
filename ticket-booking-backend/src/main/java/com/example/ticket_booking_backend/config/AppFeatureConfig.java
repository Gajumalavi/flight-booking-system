package com.example.ticket_booking_backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import lombok.Getter;
import lombok.Setter;

@Configuration
@ConfigurationProperties(prefix = "app.features")
@Getter
@Setter
public class AppFeatureConfig {
    private boolean useApi;
} 