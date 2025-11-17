package com.example.ticket_booking_backend.controller;

import com.example.ticket_booking_backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        Map<String, Object> result = authService.register(
            request.get("email"), 
            request.get("password"),
            request.get("firstName"),
            request.get("lastName"),
            request.get("phone"),
            request.get("address")
        );
        return ResponseEntity.ok(result);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        Map<String, Object> result = authService.login(request.get("email"), request.get("password"));
        return ResponseEntity.ok(result);
    }
}
