package com.pm.backend.controller;

import com.pm.backend.model.ChatMessage;
import com.pm.backend.model.Project;
import com.pm.backend.model.User;
import com.pm.backend.repository.ChatMessageRepository;
import com.pm.backend.repository.ProjectRepository;
import com.pm.backend.repository.UserRepository;
import com.pm.backend.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatMessageRepository chatMessageRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ChatController(ChatMessageRepository chatMessageRepository, ProjectRepository projectRepository,
                          UserRepository userRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ChatMessage>> getProjectMessages(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));
        List<ChatMessage> messages = chatMessageRepository.findByProjectOrderByCreatedAtAsc(project);
        return ResponseEntity.ok(messages);
    }

    @PostMapping
    public ResponseEntity<ChatMessage> sendMessage(@RequestBody ChatMessage messageRequest,
                                                   @AuthenticationPrincipal UserPrincipal userPrincipal) {
        User sender = userRepository.findById(userPrincipal.getId()).orElseThrow();
        Project project = projectRepository.findById(messageRequest.getProject().getId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        ChatMessage message = ChatMessage.builder()
                .content(messageRequest.getContent())
                .sender(sender)
                .project(project)
                .fileUrl(messageRequest.getFileUrl())
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);
        return ResponseEntity.ok(savedMessage);
    }
}
