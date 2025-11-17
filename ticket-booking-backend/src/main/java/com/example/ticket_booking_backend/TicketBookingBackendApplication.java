package com.example.ticket_booking_backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
@ConfigurationPropertiesScan("com.example.ticket_booking_backend.config")
public class TicketBookingBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(TicketBookingBackendApplication.class, args);
	}

}
