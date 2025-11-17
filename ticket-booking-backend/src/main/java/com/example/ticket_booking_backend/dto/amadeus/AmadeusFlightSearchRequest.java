package com.example.ticket_booking_backend.dto.amadeus;

import lombok.Data;
import lombok.Builder;
import java.util.List;

@Data
@Builder
public class AmadeusFlightSearchRequest {
    private List<OriginDestination> originDestinations;
    private List<Traveler> travelers;
    private List<String> sources;
    private SearchCriteria searchCriteria;
    
    @Data
    @Builder
    public static class OriginDestination {
        private String id;
        private String originLocationCode;
        private String destinationLocationCode;
        private String departureDateTimeRange;
    }
    
    @Data
    @Builder
    public static class Traveler {
        private String id;
        private String travelerType;
    }
    
    @Data
    @Builder
    public static class SearchCriteria {
        private Integer maxFlightOffers;
        private FlightFilters flightFilters;
    }
    
    @Data
    @Builder
    public static class FlightFilters {
        private List<CabinRestriction> cabinRestrictions;
    }
    
    @Data
    @Builder
    public static class CabinRestriction {
        private String cabin;
        private List<String> originDestinationIds;
    }
} 