package com.example.ticket_booking_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.util.FileCopyUtils;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseInitializer.class);
    
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        logger.info("Initializing database with additional schema updates...");
        
        // Execute schema update scripts in order
        executeScript("db/update-schema.sql");
        executeScript("db/add-seat-hold-columns.sql");
        executeScript("db/add-airline-column.sql");
        executeScript("db/add-status-column.sql");
        executeScript("db/add-state-column.sql");
        executeScript("db/add-airport-details-columns.sql");
        executeScript("db/add-reserved-column.sql");
        executeScript("db/fix-booking-status-constraint.sql");
        
        // Execute data population scripts
        executeScript("db/populate-airport-details.sql");
        
        logger.info("Database initialization completed.");
    }
    
    private void executeScript(String scriptPath) {
        try {
            logger.info("Executing SQL script: {}", scriptPath);
            ClassPathResource resource = new ClassPathResource(scriptPath);
            
            if (resource.exists()) {
                try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
                    String sqlScript = FileCopyUtils.copyToString(reader);
                    jdbcTemplate.execute(sqlScript);
                    logger.info("Successfully executed script: {}", scriptPath);
                }
            } else {
                logger.warn("SQL script not found: {}", scriptPath);
            }
        } catch (IOException e) {
            logger.error("Error reading SQL script: {}", scriptPath, e);
        } catch (Exception e) {
            logger.error("Error executing SQL script: {}", scriptPath, e);
        }
    }
} 