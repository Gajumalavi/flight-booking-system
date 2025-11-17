package com.example.ticket_booking_backend.dto.amadeus;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@Data
public class AmadeusFlightOffer {
    private String type;
    private String id;
    private String source;
    
    @JsonProperty("instantTicketingRequired")
    private boolean instantTicketingRequired;
    
    @JsonProperty("nonHomogeneous")
    private boolean nonHomogeneous;
    
    @JsonProperty("oneWay")
    private boolean oneWay;
    
    @JsonProperty("lastTicketingDate")
    private String lastTicketingDate;
    
    @JsonProperty("itineraries")
    private List<Itinerary> itineraries;
    
    @JsonProperty("price")
    private Price price;
    
    @JsonProperty("pricingOptions")
    private PricingOptions pricingOptions;
    
    @Data
    public static class Itinerary {
        private String duration;
        private List<Segment> segments;
    }
    
    @Data
    public static class Segment {
        private String id;
        private String duration;
        private String numberOfStops;
        private String blacklistedInEU;
        
        @JsonProperty("departure")
        private Terminal departure;
        
        @JsonProperty("arrival")
        private Terminal arrival;
        
        @JsonProperty("carrierCode")
        private String carrierCode;
        
        @JsonProperty("number")
        private String number;
        
        @JsonProperty("aircraft")
        private Aircraft aircraft;
        
        @JsonProperty("operating")
        private Operating operating;
    }
    
    @Data
    public static class Terminal {
        @JsonProperty("iataCode")
        private String iataCode;
        
        @JsonProperty("terminal")
        private String terminal;
        
        @JsonProperty("at")
        private String at;
    }
    
    @Data
    public static class Aircraft {
        @JsonProperty("code")
        private String code;
    }
    
    @Data
    public static class Operating {
        @JsonProperty("carrierCode")
        private String carrierCode;
    }
    
    @Data
    public static class Price {
        @JsonProperty("currency")
        private String currency;
        
        @JsonProperty("total")
        private String total;
        
        @JsonProperty("base")
        private String base;
        
        @JsonProperty("fees")
        private List<Fee> fees;
        
        @JsonProperty("grandTotal")
        private String grandTotal;
    }
    
    @Data
    public static class Fee {
        @JsonProperty("amount")
        private String amount;
        
        @JsonProperty("type")
        private String type;
    }
    
    @Data
    public static class PricingOptions {
        @JsonProperty("fareType")
        private List<String> fareType;
        
        @JsonProperty("includedCheckedBagsOnly")
        private boolean includedCheckedBagsOnly;
    }
} 