package com.example.ticket_booking_backend.security;

import com.example.ticket_booking_backend.model.User;
import com.example.ticket_booking_backend.repository.UserRepository;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;

@Component
public class JwtUtil {

    private static final Logger logger = Logger.getLogger(JwtUtil.class.getName());
    private static final String SECRET_KEY = "your_super_secret_key_your_super_secret_key"; // Must be 32+ chars
    private static final long EXPIRATION_TIME = 86400000; // 24 hours

    private final Key key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());
    private final UserRepository userRepository;

    public JwtUtil(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String generateToken(String email) {
        Optional<User> userOptional = userRepository.findByEmail(email);
        
        Map<String, Object> claims = new HashMap<>();
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            claims.put("role", user.getRole().name());
            claims.put("userId", user.getId());
            logger.info("Generating JWT token for userId: " + user.getId() + " and role: " + user.getRole());
        } else {
            logger.warning("Generating token for email not found in database: " + email);
        }
        
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractEmail(String token) {
        try {
            String email = Jwts.parserBuilder().setSigningKey(key).build()
                    .parseClaimsJws(token).getBody().getSubject();
            logger.info("Extracted email from token: " + email);
            return email;
        } catch (Exception e) {
            logger.warning("Error extracting email from token: " + e.getMessage());
            return null;
        }
    }
    
    public Claims extractAllClaims(String token) {
        try {
            Claims claims = Jwts.parserBuilder().setSigningKey(key).build()
                    .parseClaimsJws(token).getBody();
            logger.info("Extracted claims from token: " + claims);
            return claims;
        } catch (Exception e) {
            logger.warning("Error extracting claims from token: " + e.getMessage());
            return Jwts.claims();
        }
    }

    public boolean validateToken(String token) {
        try {
            // Check expiration
            Claims claims = Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
            boolean isExpired = claims.getExpiration().before(new Date());
            
            if (isExpired) {
                logger.warning("Token is expired");
                return false;
            }
            
            // Check if subject exists
            String email = claims.getSubject();
            if (email == null || email.isEmpty()) {
                logger.warning("Token has no subject (email)");
                return false;
            }
            
            // Verify user exists in database
            Long userId = claims.get("userId", Long.class);
            if (userId != null) {
                boolean userExists = userRepository.existsById(userId);
                if (!userExists) {
                    logger.warning("User with ID " + userId + " from token does not exist in database");
                    // Still return true to allow the filter to handle this case
                }
            }
            
            logger.info("Token validated successfully for: " + email);
            return true;
            
        } catch (SignatureException e) {
            logger.warning("Invalid JWT signature: " + e.getMessage());
            return false;
        } catch (MalformedJwtException e) {
            logger.warning("Invalid JWT token: " + e.getMessage());
            return false;
        } catch (ExpiredJwtException e) {
            logger.warning("JWT token is expired: " + e.getMessage());
            return false;
        } catch (UnsupportedJwtException e) {
            logger.warning("JWT token is unsupported: " + e.getMessage());
            return false;
        } catch (IllegalArgumentException e) {
            logger.warning("JWT claims string is empty: " + e.getMessage());
            return false;
        } catch (Exception e) {
            logger.warning("Error validating token: " + e.getMessage());
            return false;
        }
    }
}
