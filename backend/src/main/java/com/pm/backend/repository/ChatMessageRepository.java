package com.pm.backend.repository;

import com.pm.backend.model.ChatMessage;
import com.pm.backend.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByProjectOrderByCreatedAtAsc(Project project);
}
