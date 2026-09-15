package com.pm.backend.controller;

import com.pm.backend.model.Notification;
import com.pm.backend.model.User;
import com.pm.backend.repository.NotificationRepository;
import com.pm.backend.repository.UserRepository;
import com.pm.backend.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import com.pm.backend.service.EmailService;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository, EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        User recipient = userRepository.findById(userPrincipal.getId()).orElseThrow();
        List<Notification> notifications = notificationRepository.findByRecipientOrderByCreatedAtDesc(recipient);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        User recipient = userRepository.findById(userPrincipal.getId()).orElseThrow();
        List<Notification> notifications = notificationRepository.findByRecipientAndIsReadFalseOrderByCreatedAtDesc(recipient);
        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + id));

        if (!notification.getRecipient().getId().equals(userPrincipal.getId())) {
            return ResponseEntity.status(403).build();
        }

        notification.setIsRead(true);
        Notification updatedNotification = notificationRepository.save(notification);
        return ResponseEntity.ok(updatedNotification);
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        User recipient = userRepository.findById(userPrincipal.getId()).orElseThrow();
        List<Notification> unread = notificationRepository.findByRecipientAndIsReadFalseOrderByCreatedAtDesc(recipient);
        for (Notification n : unread) {
            n.setIsRead(true);
        }
        notificationRepository.saveAll(unread);
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<?> createNotification(@RequestBody java.util.Map<String, Object> payload,
                                               @AuthenticationPrincipal UserPrincipal userPrincipal) {
        String title = (String) payload.getOrDefault("title", "Notification Alert");
        String message = (String) payload.getOrDefault("message", "System update");
        String type = (String) payload.getOrDefault("type", "SYSTEM_ALERT");
        Object recipientIdObj = payload.get("recipientId");

        List<User> recipients;
        if (recipientIdObj != null && !"ALL".equals(String.valueOf(recipientIdObj))) {
            try {
                Long recipientId = Long.parseLong(String.valueOf(recipientIdObj));
                recipients = userRepository.findById(recipientId).map(List::of).orElseGet(() -> userRepository.findAll());
            } catch (Exception e) {
                recipients = userRepository.findAll();
            }
        } else {
            recipients = userRepository.findAll();
        }

        for (User recipient : recipients) {
            Notification notification = Notification.builder()
                    .title(title)
                    .message(message)
                    .type(type)
                    .isRead(false)
                    .recipient(recipient)
                    .build();
            notificationRepository.save(notification);

            if (recipient.getEmail() != null && recipient.getEmail().contains("@")) {
                emailService.sendEmailAlert(recipient.getEmail(), "[Project Workspace Alert] " + title, message);
            }
        }

        return ResponseEntity.ok().body(java.util.Map.of("message", "Notifications dispatched to " + recipients.size() + " user(s)."));
    }
}
