package com.example.ticket_booking_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.example.ticket_booking_backend.model.Role;
import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String requestURI = request.getRequestURI();
        String authHeader = request.getHeader("Authorization");

        System.out.println("\n----------------------------------------------------------");
        System.out.println("🔒 JWT Filter Processing Request");
        System.out.println("----------------------------------------------------------");
        System.out.println("Request URI: " + requestURI);
        System.out.println("Authorization Header: " + (authHeader != null ? authHeader.substring(0, Math.min(20, authHeader.length())) + "..." : "null"));
        System.out.println("HTTP Method: " + request.getMethod());
        System.out.println("Remote IP: " + request.getRemoteAddr());

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("❌ No valid Authorization header found, bypassing JWT validation");
            chain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        System.out.println("�� Extracted Token: " + token.substring(0, Math.min(15, token.length())) + "...");

        try {
            // Check if token is valid first
            boolean isValid = jwtUtil.validateToken(token);
            System.out.println("🔍 Token validation result: " + (isValid ? "VALID ✓" : "INVALID ✗"));
            
            if (!isValid) {
                System.out.println("❌ Invalid token detected: Token validation failed");
                chain.doFilter(request, response);
                return;
            }
            
            String email = jwtUtil.extractEmail(token);
            System.out.println("👤 Extracted Email from Token: " + email);
            
            if (email == null || email.isEmpty()) {
                System.out.println("❌ No email found in token!");
                chain.doFilter(request, response);
                return;
            }
            
            Claims claims = jwtUtil.extractAllClaims(token);
            String role = claims.get("role", String.class);
            Long userId = claims.get("userId", Long.class);
            
            System.out.println("📊 Token details - Role: " + role + ", UserId: " + userId);

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                // First try to find user by email from token
                Optional<User> userOptional = userRepository.findByEmail(email);
                
                // If not found by email but we have userId, try by ID
                if (!userOptional.isPresent() && userId != null) {
                    System.out.println("🔍 User not found by email, trying by ID: " + userId);
                    userOptional = userRepository.findById(userId);
                }
                
                if (userOptional.isPresent()) {
                    User user = userOptional.get();
                    System.out.println("✅ User found - ID: " + user.getId() + ", Email: " + user.getEmail() + ", Role: " + user.getRole());
                    
                    // Verify email matches what's in token
                    if (!user.getEmail().equals(email)) {
                        System.out.println("⚠️ WARNING: Email mismatch between token (" + email + ") and database (" + user.getEmail() + ")");
                    }
                    
                    // If the token has role information, check consistency
                    if (role != null && !role.isEmpty()) {
                        try {
                            Role enumRole = Role.valueOf(role);
                            
                            // Check if user role in DB matches token
                            if (user.getRole() != enumRole) {
                                System.out.println("⚠️ WARNING: Role mismatch between token (" + enumRole + ") and database (" + user.getRole() + ")");
                            }
                        } catch (Exception e) {
                            System.out.println("❌ Error parsing role from token: " + e.getMessage());
                        }
                    }
                    
                    CustomUserDetails userDetails = new CustomUserDetails(user);
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    
                    System.out.println("🔐 Authentication set in SecurityContext with authorities: " + 
                                       authentication.getAuthorities());
                } else {
                    System.out.println("❌ User not found for email: " + email + " or userId: " + userId);
                }
            } else {
                System.out.println("ℹ️ Authentication already exists in SecurityContext");
            }
        } catch (Exception e) {
            System.out.println("❌ Error processing JWT token: " + e.getMessage());
            e.printStackTrace();
        }

        System.out.println("➡️ Continuing filter chain");
        System.out.println("----------------------------------------------------------\n");

        chain.doFilter(request, response);
    }
}
