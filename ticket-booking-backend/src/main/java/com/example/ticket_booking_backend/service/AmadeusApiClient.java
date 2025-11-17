package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.config.AmadeusApiConfig;
import com.example.ticket_booking_backend.config.ApiQuotaConfig;
import com.example.ticket_booking_backend.dto.amadeus.AmadeusFlightOffersResponse;
import com.example.ticket_booking_backend.dto.amadeus.AmadeusTokenResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class AmadeusApiClient {
    private static final Logger logger = LoggerFactory.getLogger(AmadeusApiClient.class);
    private final WebClient webClient;
    private final AmadeusApiConfig amadeusApiConfig;
    private final ApiQuotaConfig apiQuotaConfig;
    private AmadeusTokenResponse tokenResponse;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    @Autowired
    public AmadeusApiClient(AmadeusApiConfig amadeusApiConfig, ApiQuotaConfig apiQuotaConfig) {
        this.amadeusApiConfig = amadeusApiConfig;
        this.apiQuotaConfig = apiQuotaConfig;
        this.webClient = WebClient.builder()
                .baseUrl(amadeusApiConfig.getBaseUrl())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                .build();
    }

    /**
     * Get authorization token from Amadeus API
     */
    private synchronized Mono<String> getAuthToken() {
        // If we have a token already and it's not expired, return it
        if (tokenResponse != null && !tokenResponse.isExpired()) {
            logger.debug("Using existing token");
            return Mono.just(tokenResponse.getAccessToken());
        }

        logger.info("Requesting new token from Amadeus API");
        
        // Otherwise, request a new token
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("grant_type", "client_credentials");
        formData.add("client_id", amadeusApiConfig.getKey());
        formData.add("client_secret", amadeusApiConfig.getSecret());

        return webClient.post()
                .uri(amadeusApiConfig.getTokenUrl())
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(AmadeusTokenResponse.class)
                .doOnNext(token -> this.tokenResponse = token)
                .map(AmadeusTokenResponse::getAccessToken);
    }

    /**
     * Search for flights using Amadeus API
     */
    public Mono<AmadeusFlightOffersResponse> searchFlights(String origin, String destination, LocalDate departureDate) {
        if (!apiQuotaConfig.hasQuotaRemaining()) {
            logger.warn("API quota has been exceeded for the month. Cannot perform flight search.");
            return Mono.error(new RuntimeException("API quota exceeded for the month"));
        }

        logger.info("Searching flights from {} to {} on {}", origin, destination, departureDate);
        
        return getAuthToken()
                .flatMap(token -> {
                    apiQuotaConfig.incrementCallCount();
                    
                    // Build the query parameters
                    String formattedDate = departureDate.format(DATE_FORMATTER);
                    
                    return webClient.get()
                            .uri(uriBuilder -> uriBuilder
                                    .path(amadeusApiConfig.getFlightSearchUrl())
                                    .queryParam("originLocationCode", origin)
                                    .queryParam("destinationLocationCode", destination)
                                    .queryParam("departureDate", formattedDate)
                                    .queryParam("adults", 1)
                                    .queryParam("max", 20)
                                    .build())
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                            .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                            .retrieve()
                            .bodyToMono(AmadeusFlightOffersResponse.class);
                })
                .doOnError(error -> logger.error("Error searching flights: {}", error.getMessage()));
    }
} 