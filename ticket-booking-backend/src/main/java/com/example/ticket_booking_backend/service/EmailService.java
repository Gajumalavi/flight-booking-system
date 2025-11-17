package com.example.ticket_booking_backend.service;

import com.example.ticket_booking_backend.model.Booking;
import com.example.ticket_booking_backend.model.Passenger;
import com.example.ticket_booking_backend.model.Seat;
import com.example.ticket_booking_backend.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import com.sendgrid.*;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Base64;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import com.sendgrid.helpers.mail.objects.Attachments;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("EEE, MMM d, yyyy h:mm a", Locale.ENGLISH);

    private final TemplateEngine templateEngine;

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${app.email.booking-confirmation.subject}")
    private String bookingConfirmationSubject;

    @Value("${app.email.booking-cancellation.subject}")
    private String bookingCancellationSubject;

    @Value("${app.email.enable:false}")
    private boolean emailEnabled;

    @Value("${app.email.support-email}")
    private String supportEmail;

    @Value("${sendgrid.api.key}")
    private String sendGridApiKey;

    @Autowired
    public EmailService(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    /**
     * Send a booking confirmation email to the user
     */
    @Async("taskExecutor")
    public void sendBookingConfirmationEmail(Booking booking, User user) {
        if (!emailEnabled) {
            logger.info("Email service is disabled. Would have sent booking confirmation for booking ID: {}", booking.getId());
            return;
        }

        try {
            // Always use the current user's email to ensure we have the most updated email address
            // Only fall back to passenger email if needed
            String toEmail = user.getEmail();
            
            if (toEmail == null || toEmail.isEmpty()) {
                // Fall back to passenger email if user email is empty
                toEmail = booking.getPassengers() != null && !booking.getPassengers().isEmpty() && 
                         booking.getPassengers().get(0).getEmail() != null ? 
                         booking.getPassengers().get(0).getEmail() : "unknown@example.com";
                
                logger.warn("User email is empty for user ID: {}, using passenger email: {}", 
                           user.getId(), toEmail);
            }
            
            logger.info("Sending booking confirmation email to: {} for booking ID: {}", toEmail, booking.getId());
            
            // Format booking reference for email subject
            String formattedBookingRef = String.format("Booking #%d", booking.getId());
            
            // Prepare email context with all necessary data
            Map<String, Object> variables = new HashMap<>();
            variables.put("booking", booking);
            variables.put("user", user);
            variables.put("formattedDepartureTime", booking.getFlight().getDepartureTime().format(DATE_TIME_FORMATTER));
            variables.put("formattedArrivalTime", booking.getFlight().getArrivalTime().format(DATE_TIME_FORMATTER));
            variables.put("supportEmail", supportEmail);
            
            // Send email using the booking confirmation template
            String emailContent = generateEmailContent("email/booking-confirmation", variables);
            sendEmail(toEmail, String.format(bookingConfirmationSubject, formattedBookingRef), emailContent);
            
            logger.info("Booking confirmation email sent successfully to {} for booking ID: {}", toEmail, booking.getId());
        } catch (Exception e) {
            logger.error("Failed to send booking confirmation email for booking ID: " + booking.getId(), e);
            // Don't rethrow - we don't want email failures to break the booking process
        }
    }

    /**
     * Send a booking cancellation email to the user
     */
    @Async("taskExecutor")
    public void sendBookingCancellationEmail(Booking booking, User user) {
        if (!emailEnabled) {
            logger.info("Email service is disabled. Would have sent booking cancellation for booking ID: {}", booking.getId());
            return;
        }

        try {
            // Always use the current user's email to ensure we have the most updated email address
            // Only fall back to passenger email if needed
            String toEmail = user.getEmail();
            
            if (toEmail == null || toEmail.isEmpty()) {
                // Fall back to passenger email if user email is empty
                toEmail = booking.getPassengers() != null && !booking.getPassengers().isEmpty() && 
                         booking.getPassengers().get(0).getEmail() != null ? 
                         booking.getPassengers().get(0).getEmail() : "unknown@example.com";
                
                logger.warn("User email is empty for user ID: {}, using passenger email: {}", 
                           user.getId(), toEmail);
            }
            
            logger.info("Sending booking cancellation email to: {} for booking ID: {}", toEmail, booking.getId());
            
            // Format booking reference for email subject
            String formattedBookingRef = String.format("Booking #%d", booking.getId());
            
            // Check if there are passengers and prepare their names - avoid lazy loading issues
            boolean hasPassengers = false;
            List<String> passengerNames = new ArrayList<>();
            String seatNumbers = "";
            
            try {
                if (booking.getPassengers() != null && !booking.getPassengers().isEmpty()) {
                    hasPassengers = true;
                    // Extract passenger names without relying on continued session access
                    for (Passenger passenger : booking.getPassengers()) {
                        passengerNames.add(passenger.getFirstName() + " " + passenger.getLastName());
                    }
                } 
            } catch (Exception e) {
                logger.warn("Could not access passenger information due to lazy loading, using seat information instead");
                hasPassengers = false;
            }
            
            // If we don't have passengers or if accessing them failed, prepare seat numbers
            if (!hasPassengers && booking.getSeats() != null) {
                List<String> seats = new ArrayList<>();
                for (Seat seat : booking.getSeats()) {
                    seats.add(seat.getSeatNumber());
                }
                seatNumbers = String.join(", ", seats);
            }
            
            // Calculate the total fare for refund information
            double totalFare = 0.0;
            try {
                if (booking.getFlight() != null) {
                    Double price = booking.getFlight().getPrice();
                    if (price != null) {
                        totalFare = price * booking.getSeats().size();
                    }
                }
            } catch (Exception e) {
                logger.warn("Could not calculate total fare: {}", e.getMessage());
            }
            
            // Prepare email context with all necessary data
            Map<String, Object> variables = new HashMap<>();
            variables.put("booking", booking);
            variables.put("user", user);
            variables.put("formattedDepartureTime", booking.getFlight().getDepartureTime().format(DATE_TIME_FORMATTER));
            variables.put("supportEmail", supportEmail);
            variables.put("hasPassengers", hasPassengers);
            variables.put("passengerNames", passengerNames);
            variables.put("seatNumbers", seatNumbers);
            variables.put("wasPaidBooking", booking.getStatus().toString().equals("PAID") || booking.getStatus().toString().contains("PAID"));
            variables.put("totalFare", String.format("%.2f", totalFare));
            variables.put("refundReference", "REF-" + booking.getId());
            
            // Send email using the booking cancellation template
            String emailContent = generateEmailContent("email/booking-cancellation", variables);
            sendEmail(toEmail, String.format(bookingCancellationSubject, formattedBookingRef), emailContent);
            
            logger.info("Booking cancellation email sent successfully to {} for booking ID: {}", toEmail, booking.getId());
        } catch (Exception e) {
            logger.error("Failed to send booking cancellation email for booking ID: " + booking.getId(), e);
            // Don't rethrow - we don't want email failures to break the cancellation process
        }
    }

    /**
     * Send a ticket attachment email to the user
     */
    @Async("taskExecutor")
    public void sendTicketEmail(Booking booking, User user, byte[] ticketPdf) {
        if (!emailEnabled) {
            logger.info("Email service is disabled. Would have sent ticket email for booking ID: {}", booking.getId());
            return;
        }

        try {
            // Always use the current user's email to ensure we have the most updated email address
            // Only fall back to passenger email if needed
            String toEmail = user.getEmail();
            
            if (toEmail == null || toEmail.isEmpty()) {
                // Fall back to passenger email if user email is empty
                toEmail = booking.getPassengers() != null && !booking.getPassengers().isEmpty() && 
                         booking.getPassengers().get(0).getEmail() != null ? 
                         booking.getPassengers().get(0).getEmail() : "unknown@example.com";
                
                logger.warn("User email is empty for user ID: {}, using passenger email: {}", 
                           user.getId(), toEmail);
            }
            
            logger.info("Sending ticket email to: {} for booking ID: {}", toEmail, booking.getId());
            
            // Format booking reference for email subject
            String formattedBookingRef = String.format("Booking #%d", booking.getId());
            String subject = "Your Flight Ticket - " + formattedBookingRef;
            
            // Prepare email context with all necessary data
            Map<String, Object> variables = new HashMap<>();
            variables.put("booking", booking);
            variables.put("user", user);
            variables.put("supportEmail", supportEmail);
            
            // Send email with attachment using the ticket email template
            String emailContent = generateEmailContent("email/ticket-email", variables);
            sendEmailWithAttachment(toEmail, subject, emailContent, "flight-ticket.pdf", ticketPdf);
            
            logger.info("Ticket email with attachment sent successfully to {} for booking ID: {}", toEmail, booking.getId());
        } catch (Exception e) {
            logger.error("Failed to send ticket email for booking ID: " + booking.getId(), e);
            // Don't rethrow - we don't want email failures to break the process
        }
    }

    /**
     * Send a password reset OTP email to the user
     */
    @Async("taskExecutor")
    public void sendPasswordResetOtpEmail(String email, String otp) {
        if (!emailEnabled) {
            logger.info("Email service is disabled. Would have sent password reset OTP to: {}", email);
            return;
        }

        try {
            // Prepare email context with necessary data
            Map<String, Object> variables = new HashMap<>();
            variables.put("otp", otp);
            variables.put("expiryMinutes", 10); // OTP expires in 10 minutes
            variables.put("supportEmail", supportEmail);
            
            // Generate and send email using the password reset template
            String subject = "Password Reset OTP - Flight Booking System";
            String emailContent = generateEmailContent("email/password-reset-otp", variables);
            sendEmail(email, subject, emailContent);
            
            logger.info("Password reset OTP email sent successfully to {}", email);
        } catch (Exception e) {
            logger.error("Failed to send password reset OTP email to " + email, e);
            // Don't rethrow - we don't want email failures to break the password reset process
        }
    }

    /**
     * Send a password change confirmation email to the user
     */
    @Async("taskExecutor")
    public void sendPasswordChangeConfirmationEmail(String email) {
        if (!emailEnabled) {
            logger.info("Email service is disabled. Would have sent password change confirmation to: {}", email);
            return;
        }

        try {
            // Prepare email context with necessary data
            Map<String, Object> variables = new HashMap<>();
            variables.put("timestamp", java.time.LocalDateTime.now().format(DATE_TIME_FORMATTER));
            variables.put("supportEmail", supportEmail);
            
            // Generate and send email using the password change confirmation template
            String subject = "Your Password Has Been Changed - Flight Booking System";
            String emailContent = generateEmailContent("email/password-change-confirmation", variables);
            sendEmail(email, subject, emailContent);
            
            logger.info("Password change confirmation email sent successfully to {}", email);
        } catch (Exception e) {
            logger.error("Failed to send password change confirmation email to " + email, e);
            // Don't rethrow - we don't want email failures to break the password change process
        }
    }

    /**
     * Generate email content using Thymeleaf templates
     */
    private String generateEmailContent(String templateName, Map<String, Object> variables) {
        Context context = new Context();
        variables.forEach(context::setVariable);
        return templateEngine.process(templateName, context);
    }

    /**
     * Send a simple HTML email
     */
    private void sendEmail(String to, String subject, String content) throws IOException {
        Email from = new Email(fromEmail);
        Email toEmail = new Email(to);
        Content emailContent = new Content("text/html", content);
        Mail mail = new Mail(from, subject, toEmail, emailContent);
        SendGrid sg = new SendGrid(sendGridApiKey);
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sg.api(request);
            logger.info("SendGrid response: {} {}", response.getStatusCode(), response.getBody());
        } catch (IOException ex) {
            logger.error("SendGrid email send failed", ex);
            throw ex;
        }
    }

    /**
     * Send an email with PDF attachment
     */
    private void sendEmailWithAttachment(String to, String subject, String content, String attachmentName, byte[] attachment) throws IOException {
        Email from = new Email(fromEmail);
        Email toEmail = new Email(to);
        Content emailContent = new Content("text/html", content);
        Mail mail = new Mail(from, subject, toEmail, emailContent);
        Attachments attachments = new Attachments();
        attachments.setFilename(attachmentName);
        attachments.setType("application/pdf");
        attachments.setDisposition("attachment");
        attachments.setContent(Base64.getEncoder().encodeToString(attachment));
        mail.addAttachments(attachments);
        SendGrid sg = new SendGrid(sendGridApiKey);
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sg.api(request);
            logger.info("SendGrid response: {} {}", response.getStatusCode(), response.getBody());
        } catch (IOException ex) {
            logger.error("SendGrid email send with attachment failed", ex);
            throw ex;
        }
    }

    public void sendBookingConfirmationEmailDirect(String to, String subject, String content) throws IOException {
        sendEmail(to, subject, content);
    }
} 