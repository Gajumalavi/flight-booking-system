package com.example.ticket_booking_backend.dto.amadeus;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@Data
public class AmadeusFlightOffersResponse {
    @JsonProperty("meta")
    private Meta meta;
    
    @JsonProperty("data")
    private List<AmadeusFlightOffer> data;
    
    @JsonProperty("dictionaries")
    private Dictionaries dictionaries;
    
    @Data
    public static class Meta {
        @JsonProperty("count")
        private int count;
        
        @JsonProperty("links")
        private Links links;
    }
    
    @Data
    public static class Links {
        @JsonProperty("self")
        private String self;
    }
    
    @Data
    public static class Dictionaries {
        @JsonProperty("locations")
        private Object locations;
        
        @JsonProperty("aircraft")
        private Object aircraft;
        
        @JsonProperty("currencies")
        private Object currencies;
        
        @JsonProperty("carriers")
        private Object carriers;
    }
} 