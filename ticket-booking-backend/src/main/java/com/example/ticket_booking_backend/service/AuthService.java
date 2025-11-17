package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.model.Role;
import com.example.ticket_booking_backend.repository.UserRepository;
import com.example.ticket_booking_backend.security.JwtUtil;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.logging.Logger;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder;
    private static final Logger logger = Logger.getLogger(AuthService.class.getName());

    public AuthService(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    public Map<String, Object> register(String email, String password, String firstName, String lastName, String phone, String address) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hashedPassword = encoder.encode(password);

        System.out.println("🔹 Plain Text Password: " + password);
        System.out.println("🔹 Hashed Password: " + hashedPassword);

        User user = new User();
        user.setEmail(email);
        user.setPassword(hashedPassword);
        user.setRole(Role.CUSTOMER);
        
        // Set names if provided
        if (firstName != null && !firstName.trim().isEmpty()) {
            user.setFirstName(firstName);
        }
        
        if (lastName != null && !lastName.trim().isEmpty()) {
            user.setLastName(lastName);
        }
        
        // Set phone if provided
        if (phone != null && !phone.trim().isEmpty()) {
            user.setPhone(phone);
        }
        
        // Set address if provided
        if (address != null && !address.trim().isEmpty()) {
            user.setAddress(address);
        }
        
        User savedUser = userRepository.save(user);

        String token = jwtUtil.generateToken(email);
        
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("userId", savedUser.getId());
        response.put("email", savedUser.getEmail());
        response.put("role", savedUser.getRole().toString());
        response.put("firstName", savedUser.getFirstName());
        response.put("lastName", savedUser.getLastName());
        response.put("phone", savedUser.getPhone());
        response.put("address", savedUser.getAddress());
        
        return response;
    }


    public Map<String, Object> login(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String storedHashedPassword = user.getPassword();
            System.out.println("🔹 Stored Hashed Password: " + storedHashedPassword);
            System.out.println("🔹 Entered Plain Text Password: " + password);

            if (passwordEncoder.matches(password, storedHashedPassword)) {
                System.out.println("✅ Password Matched. Generating Token...");
                String token = jwtUtil.generateToken(email);
                
                Map<String, Object> response = new HashMap<>();
                response.put("token", token);
                response.put("userId", user.getId());
                response.put("email", user.getEmail());
                response.put("role", user.getRole().toString());
                response.put("firstName", user.getFirstName());
                response.put("lastName", user.getLastName());
                
                return response;
            } else {
                System.out.println("❌ Password Mismatch!");
                throw new RuntimeException("Invalid email or password");
            }
        } else {
            System.out.println("❌ User Not Found for email: " + email);
            throw new RuntimeException("Invalid email or password");
        }
    }
}
