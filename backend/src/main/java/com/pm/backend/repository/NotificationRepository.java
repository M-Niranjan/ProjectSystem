package com.pm.backend.repository;

import com.pm.backend.model.Notification;
import com.pm.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientOrderByCreatedAtDesc(User recipient);
    List<Notification> findByRecipientAndIsReadFalseOrderByCreatedAtDesc(User recipient);

    // Find all unread TASK_ASSIGNED notifications for a specific recipient and task title
    @Query("SELECT n FROM Notification n WHERE n.recipient = :recipient AND n.type = :type AND n.isRead = false AND n.message LIKE %:titleFragment%")
    List<Notification> findUnreadByRecipientAndTypeAndMessageContaining(
            @Param("recipient") User recipient,
            @Param("type") String type,
            @Param("titleFragment") String titleFragment
    );
}
