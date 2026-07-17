package com.pm.backend.repository;

import com.pm.backend.model.DirectMessage;
import com.pm.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {
    
    @Query("SELECT dm FROM DirectMessage dm WHERE " +
           "(dm.sender = :user1 AND dm.recipient = :user2) OR " +
           "(dm.sender = :user2 AND dm.recipient = :user1) " +
           "ORDER BY dm.createdAt ASC")
    List<DirectMessage> findConversation(@Param("user1") User user1, @Param("user2") User user2);

    List<DirectMessage> findByRecipientAndIsReadFalse(User recipient);
}
