package com.pm.backend.controller;

import com.pm.backend.model.DirectMessage;
import com.pm.backend.model.User;
import com.pm.backend.model.Task;
import com.pm.backend.repository.DirectMessageRepository;
import com.pm.backend.repository.UserRepository;
import com.pm.backend.repository.TaskRepository;
import com.pm.backend.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class DirectMessageController {

    private final DirectMessageRepository directMessageRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    public DirectMessageController(DirectMessageRepository directMessageRepository, 
                                   UserRepository userRepository, 
                                   TaskRepository taskRepository) {
        this.directMessageRepository = directMessageRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping("/conversation/{contactId}")
    public ResponseEntity<List<DirectMessage>> getConversation(@PathVariable Long contactId, 
                                                               @AuthenticationPrincipal UserPrincipal userPrincipal) {
        User currentUser = userRepository.findById(userPrincipal.getId()).orElseThrow();
        User contact = userRepository.findById(contactId).orElseThrow();
        
        List<DirectMessage> messages = directMessageRepository.findConversation(currentUser, contact);
        
        // Mark as read
        messages.forEach(m -> {
            if (m.getRecipient().getId().equals(currentUser.getId()) && !m.getIsRead()) {
                m.setIsRead(true);
                directMessageRepository.save(m);
            }
        });
        
        return ResponseEntity.ok(messages);
    }

    @PostMapping
    public ResponseEntity<DirectMessage> sendMessage(@RequestBody DirectMessage payload, 
                                                     @RequestParam(required = false) Long taskId,
                                                     @AuthenticationPrincipal UserPrincipal userPrincipal) {
        User sender = userRepository.findById(userPrincipal.getId()).orElseThrow();
        User recipient = userRepository.findById(payload.getRecipient().getId()).orElseThrow();
        
        DirectMessage dm = DirectMessage.builder()
                .content(payload.getContent())
                .sender(sender)
                .recipient(recipient)
                .isRead(false)
                .build();
                
        if (taskId != null) {
            Task task = taskRepository.findById(taskId).orElse(null);
            dm.setTask(task);
        }
        
        DirectMessage saved = directMessageRepository.save(dm);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/unread")
    public ResponseEntity<List<DirectMessage>> getUnread(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        User currentUser = userRepository.findById(userPrincipal.getId()).orElseThrow();
        List<DirectMessage> unread = directMessageRepository.findByRecipientAndIsReadFalse(currentUser);
        return ResponseEntity.ok(unread);
    }
}
