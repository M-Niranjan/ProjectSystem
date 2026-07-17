package com.pm.backend.controller;

import com.pm.backend.model.*;
import com.pm.backend.repository.*;
import com.pm.backend.security.UserPrincipal;
import com.pm.backend.service.AIService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final NotificationRepository notificationRepository;
    private final AIService aiService;
    private final DirectMessageRepository directMessageRepository;

    public TaskController(TaskRepository taskRepository, ProjectRepository projectRepository,
                          UserRepository userRepository, CommentRepository commentRepository,
                          NotificationRepository notificationRepository, AIService aiService,
                          DirectMessageRepository directMessageRepository) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.notificationRepository = notificationRepository;
        this.aiService = aiService;
        this.directMessageRepository = directMessageRepository;
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<Task>> getProjectTasks(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));
        List<Task> tasks = taskRepository.findByProject(project);
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(@PathVariable Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));
        return ResponseEntity.ok(task);
    }

    @PostMapping
    public ResponseEntity<Task> createTask(@Valid @RequestBody Task task,
                                           @RequestParam(required = false) Long parentId,
                                           @AuthenticationPrincipal UserPrincipal userPrincipal) {
        User creator = userRepository.findById(userPrincipal.getId()).orElseThrow();
        task.setCreator(creator);

        Project project = projectRepository.findById(task.getProject().getId())
                .orElseThrow(() -> new RuntimeException("Project not found"));
        task.setProject(project);

        if (parentId != null) {
            Task parent = taskRepository.findById(parentId).orElseThrow();
            task.setParentTask(parent);
        }

        if (task.getStatus() == null) {
            task.setStatus("TO_DO");
        }

        // Apply AI to suggest priority if not provided
        if (task.getPriority() == null) {
            task.setPriority(aiService.predictPriority(task.getTitle(), task.getDescription(), null));
        }

        // Auto-estimate duration if empty
        if (task.getEstimatedTime() == null || task.getEstimatedTime() == 0.0) {
            int experience = task.getAssignee() != null ? 
                    userRepository.findById(task.getAssignee().getId()).map(User::getExperience).orElse(2) : 2;
            task.setEstimatedTime(aiService.estimateDuration(task.getTitle(), task.getDescription(), experience, 0));
        }

        Task savedTask = taskRepository.save(task);

        // Notify Assignee
        if (task.getAssignee() != null) {
            User assignee = userRepository.findById(task.getAssignee().getId()).orElseThrow();
            createNotification("Task Assigned", "You have been assigned: " + task.getTitle(), "TASK_ASSIGNED", assignee);

            DirectMessage dm = DirectMessage.builder()
                    .sender(creator)
                    .recipient(assignee)
                    .content("Hello, I have assigned you a new task: \"" + task.getTitle() + "\". Please review and accept it.")
                    .task(savedTask)
                    .isRead(false)
                    .build();
            directMessageRepository.save(dm);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(savedTask);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTask(@PathVariable Long id, @Valid @RequestBody Task taskDetails,
                                         @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));

        User currentUser = userRepository.findById(userPrincipal.getId()).orElseThrow();
        boolean isTeamLeader = currentUser.getRole().name().equals("ROLE_ADMIN") || currentUser.getRole().name().equals("ROLE_MANAGER");
        
        // Permission enforcement: Employees can only edit tasks assigned to them
        if (!isTeamLeader) {
            if (task.getAssignee() == null || !task.getAssignee().getId().equals(currentUser.getId())) {
                System.out.println("SECURITY AUDIT WARNING: User '" + currentUser.getEmail() + "' attempted unauthorized edit on task id: " + task.getId());
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only the assigned member or Team Leader can update this task.");
            }
        }

        String oldStatus = task.getStatus();
        User oldAssignee = task.getAssignee();

        task.setTitle(taskDetails.getTitle());
        task.setDescription(taskDetails.getDescription());
        task.setStatus(taskDetails.getStatus());
        task.setPriority(taskDetails.getPriority());
        task.setDueDate(taskDetails.getDueDate());
        task.setEstimatedTime(taskDetails.getEstimatedTime());
        task.setActualTime(taskDetails.getActualTime());
        task.setRecurring(taskDetails.getRecurring());
        task.setRecurringPattern(taskDetails.getRecurringPattern());

        if (taskDetails.getAssignee() != null) {
            User assignee = userRepository.findById(taskDetails.getAssignee().getId()).orElseThrow();
            task.setAssignee(assignee);
            
            // Notify if assignee has changed
            if (oldAssignee == null || !oldAssignee.getId().equals(assignee.getId())) {
                createNotification("Task Assigned", "You have been assigned: " + task.getTitle(), "TASK_ASSIGNED", assignee);

                DirectMessage dm = DirectMessage.builder()
                        .sender(currentUser)
                        .recipient(assignee)
                        .content("Hello, I have assigned you a new task: \"" + task.getTitle() + "\". Please review and accept it.")
                        .task(task)
                        .isRead(false)
                        .build();
                directMessageRepository.save(dm);
            }
        } else {
            task.setAssignee(null);
        }

        Task updatedTask = taskRepository.save(task);

        // If status transitioned from PENDING_ACCEPTANCE to TO_DO (Accept)
        if ("PENDING_ACCEPTANCE".equals(oldStatus) && "TO_DO".equals(updatedTask.getStatus()) && oldAssignee != null) {
            DirectMessage dm = DirectMessage.builder()
                    .sender(oldAssignee)
                    .recipient(task.getCreator())
                    .content("I have accepted the task: \"" + task.getTitle() + "\".")
                    .task(task)
                    .isRead(false)
                    .build();
            directMessageRepository.save(dm);
        }

        // If status transitioned from PENDING_ACCEPTANCE to BACKLOG with unassigning (Decline)
        if ("PENDING_ACCEPTANCE".equals(oldStatus) && "BACKLOG".equals(updatedTask.getStatus()) && taskDetails.getAssignee() == null && oldAssignee != null) {
            DirectMessage dm = DirectMessage.builder()
                    .sender(oldAssignee)
                    .recipient(task.getCreator())
                    .content("I have declined the task: \"" + task.getTitle() + "\". Please check the task comments for my explanation.")
                    .task(task)
                    .isRead(false)
                    .build();
            directMessageRepository.save(dm);
        }

        // Notify if task completed
        if ("COMPLETED".equals(updatedTask.getStatus()) && !"COMPLETED".equals(oldStatus)) {
            createNotification("Task Completed", "The task: " + task.getTitle() + " has been marked complete.", "TASK_COMPLETED", task.getCreator());
        }

        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found: " + id));

        User currentUser = userRepository.findById(userPrincipal.getId()).orElseThrow();
        boolean isTeamLeader = currentUser.getRole().name().equals("ROLE_ADMIN") || currentUser.getRole().name().equals("ROLE_MANAGER");

        if (!isTeamLeader) {
            System.out.println("SECURITY AUDIT WARNING: User '" + currentUser.getEmail() + "' attempted unauthorized delete on task id: " + task.getId());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only Team Leaders can delete tasks.");
        }

        taskRepository.delete(task);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable Long id) {
        Task task = taskRepository.findById(id).orElseThrow();
        List<Comment> comments = commentRepository.findByTaskOrderByCreatedAtAsc(task);
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> addComment(@PathVariable Long id, @RequestBody Comment comment,
                                              @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Task task = taskRepository.findById(id).orElseThrow();
        User currentUser = userRepository.findById(userPrincipal.getId()).orElseThrow();
        
        comment.setTask(task);
        comment.setUser(currentUser);
        
        Comment savedComment = commentRepository.save(comment);

        // Notify creator or assignee if they are different from comment sender
        if (task.getAssignee() != null && !task.getAssignee().getId().equals(currentUser.getId())) {
            createNotification("New Comment", currentUser.getName() + " commented on: " + task.getTitle(), "MENTION", task.getAssignee());
        }

        return ResponseEntity.ok(savedComment);
    }

    @PostMapping("/{id}/timer")
    public ResponseEntity<Task> updateTimer(@PathVariable Long id, @RequestParam Double additionalHours) {
        Task task = taskRepository.findById(id).orElseThrow();
        task.setActualTime(task.getActualTime() + additionalHours);
        
        // Update project spent
        Project project = task.getProject();
        project.setSpent(project.getSpent() + (additionalHours * 50.0)); // Mock hourly rate of $50
        projectRepository.save(project);

        Task updatedTask = taskRepository.save(task);
        return ResponseEntity.ok(updatedTask);
    }

    @GetMapping("/{id}/ai-subtasks")
    public ResponseEntity<List<String>> getAiSubtasks(@PathVariable Long id) {
        Task task = taskRepository.findById(id).orElseThrow();
        List<String> suggestions = aiService.suggestSubtasks(task.getTitle(), task.getDescription());
        return ResponseEntity.ok(suggestions);
    }

    @PostMapping("/{id}/dependencies/{depId}")
    public ResponseEntity<Task> addDependency(@PathVariable Long id, @PathVariable Long depId) {
        Task task = taskRepository.findById(id).orElseThrow();
        Task dependency = taskRepository.findById(depId).orElseThrow();

        task.getDependencies().add(dependency);
        Task updatedTask = taskRepository.save(task);
        return ResponseEntity.ok(updatedTask);
    }

    @DeleteMapping("/{id}/dependencies/{depId}")
    public ResponseEntity<Task> removeDependency(@PathVariable Long id, @PathVariable Long depId) {
        Task task = taskRepository.findById(id).orElseThrow();
        Task dependency = taskRepository.findById(depId).orElseThrow();

        task.getDependencies().remove(dependency);
        Task updatedTask = taskRepository.save(task);
        return ResponseEntity.ok(updatedTask);
    }

    private void createNotification(String title, String message, String type, User recipient) {
        Notification notification = Notification.builder()
                .title(title)
                .message(message)
                .type(type)
                .recipient(recipient)
                .isRead(false)
                .build();
        notificationRepository.save(notification);
    }
}
