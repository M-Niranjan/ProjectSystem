package com.pm.backend.controller;

import com.pm.backend.model.Notification;
import com.pm.backend.model.User;
import com.pm.backend.repository.NotificationRepository;
import com.pm.backend.repository.UserRepository;
import com.pm.backend.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
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
}
