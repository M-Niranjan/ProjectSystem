package com.pm.backend.controller;

import com.pm.backend.model.Attachment;
import com.pm.backend.model.Project;
import com.pm.backend.model.Task;
import com.pm.backend.model.User;
import com.pm.backend.repository.AttachmentRepository;
import com.pm.backend.repository.ProjectRepository;
import com.pm.backend.repository.TaskRepository;
import com.pm.backend.repository.UserRepository;
import com.pm.backend.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;

@RestController
@RequestMapping("/api/attachments")
public class AttachmentController {

    private final AttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public AttachmentController(AttachmentRepository attachmentRepository, TaskRepository taskRepository,
                                ProjectRepository projectRepository, UserRepository userRepository) {
        this.attachmentRepository = attachmentRepository;
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
                                        @RequestParam(required = false) Long taskId,
                                        @RequestParam(required = false) Long projectId,
                                        @AuthenticationPrincipal UserPrincipal userPrincipal) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            // Ensure uploads directory exists
            String uploadDir = "uploads";
            File directory = new File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }

            // Create unique filename
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename().replaceAll("\\s+", "_");
            Path targetPath = Paths.get(uploadDir, fileName);

            // Copy file to directory
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            // Prepare URL
            String fileUrl = "http://localhost:8080/uploads/" + fileName;

            User currentUser = userRepository.findById(userPrincipal.getId()).orElseThrow();

            Attachment attachment = Attachment.builder()
                    .fileName(file.getOriginalFilename())
                    .fileUrl(fileUrl)
                    .fileType(file.getContentType())
                    .uploadedBy(currentUser)
                    .build();

            if (taskId != null) {
                Task task = taskRepository.findById(taskId).orElseThrow();
                attachment.setTask(task);
            }
            if (projectId != null) {
                Project project = projectRepository.findById(projectId).orElseThrow();
                attachment.setProject(project);
            }

            Attachment savedAttachment = attachmentRepository.save(attachment);
            return ResponseEntity.ok(savedAttachment);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload file: " + e.getMessage());
        }
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<Attachment>> getTaskAttachments(@PathVariable Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));
        List<Attachment> attachments = attachmentRepository.findByTask(task);
        return ResponseEntity.ok(attachments);
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Attachment>> getProjectAttachments(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));
        List<Attachment> attachments = attachmentRepository.findByProject(project);
        return ResponseEntity.ok(attachments);
    }
}
