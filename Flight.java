package com.example.ticket_booking_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
// ... other imports

@Entity
@Table(name = "flights")
public class Flight {
    // ... other fields
    
    // Option 1: Change to Boolean object type (preferred)
    @Column(name = "is_api_sourced")
    private Boolean apiSourced = false;  // Default value prevents nulls
    
    // OR
    
    // Option 2: Keep primitive but initialize with default value
    // @Column(name = "is_api_sourced")
    // private boolean apiSourced = false;  // Default value prevents nulls
    
    // ... getters and setters
    
    public Boolean getApiSourced() {
        return apiSourced != null ? apiSourced : false; // Safe accessor that handles nulls
    }
    
    public void setApiSourced(Boolean apiSourced) {
        this.apiSourced = apiSourced != null ? apiSourced : false; // Safe setter that handles nulls
    }
} 