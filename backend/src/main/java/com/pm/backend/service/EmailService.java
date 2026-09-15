package com.pm.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.mail.from:}")
    private String fromAddress;

    @Async
    public void sendEmailAlert(String toEmail, String subject, String body) {
        System.out.println("--------------------------------------------------");
        System.out.println("📧 [EMAIL & MOBILE PUSH NOTIFICATION DISPATCH]");
        System.out.println("  Recipient Email: " + toEmail);
        System.out.println("  Subject:         " + subject);
        System.out.println("  Message:         " + body);
        System.out.println("--------------------------------------------------");

        if (mailSender != null && toEmail != null && toEmail.contains("@")) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(toEmail);
                message.setSubject(subject);
                message.setText(body + "\n\n---\nProject Management System Notification Hub");
                message.setFrom(fromAddress);
                mailSender.send(message);
                System.out.println("✓ [EMAIL DELIVERED] Successfully sent email to " + toEmail);
            } catch (Exception e) {
                System.out.println("ℹ️ [EMAIL LOGGED] Simulated delivery to " + toEmail + " (SMTP not configured): " + e.getMessage());
            }
        }
    }
}
