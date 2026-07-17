package com.pm.backend.controller;

import com.pm.backend.model.Project;
import com.pm.backend.model.User;
import com.pm.backend.repository.ProjectRepository;
import com.pm.backend.repository.UserRepository;
import com.pm.backend.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ProjectController(ProjectRepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<Project>> getProjects(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        User currentUser = userRepository.findById(userPrincipal.getId()).orElseThrow();
        List<Project> projects = projectRepository.findByOwnerOrMembersContains(currentUser, currentUser);
        return ResponseEntity.ok(projects);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Optional<Project> projectOpt = projectRepository.findById(id);
        if (projectOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Project project = projectOpt.get();
        // Check access
        User currentUser = userRepository.findById(userPrincipal.getId()).orElseThrow();
        if (!project.getOwner().getId().equals(currentUser.getId()) && !project.getMembers().contains(currentUser)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(project);
    }

    @PostMapping
    public ResponseEntity<Project> createProject(@Valid @RequestBody Project project, @AuthenticationPrincipal UserPrincipal userPrincipal) {
        User currentUser = userRepository.findById(userPrincipal.getId()).orElseThrow();
        if (currentUser.getRole().name().equals("ROLE_EMPLOYEE")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        project.setOwner(currentUser);
        if (project.getStatus() == null) {
            project.setStatus("PLANNING");
        }
        if (project.getPriority() == null) {
            project.setPriority("MEDIUM");
        }
        Project savedProject = projectRepository.save(project);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedProject);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable Long id, @Valid @RequestBody Project projectDetails,
                                                 @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found: " + id));

        // Check ownership
        if (!project.getOwner().getId().equals(userPrincipal.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        project.setName(projectDetails.getName());
        project.setDescription(projectDetails.getDescription());
        project.setStatus(projectDetails.getStatus());
        project.setPriority(projectDetails.getPriority());
        project.setBudget(projectDetails.getBudget());
        project.setSpent(projectDetails.getSpent());
        project.setDeadline(projectDetails.getDeadline());
        project.setColorLabel(projectDetails.getColorLabel());

        Project updatedProject = projectRepository.save(project);
        return ResponseEntity.ok(updatedProject);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found: " + id));

        // Check ownership
        if (!project.getOwner().getId().equals(userPrincipal.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        projectRepository.delete(project);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/favorite")
    public ResponseEntity<Project> toggleFavorite(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found: " + id));

        project.setIsFavorite(!project.getIsFavorite());
        Project updatedProject = projectRepository.save(project);
        return ResponseEntity.ok(updatedProject);
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<Project> addMember(@PathVariable Long id, @RequestParam String email,
                                             @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found: " + id));

        // Only owner can add members
        if (!project.getOwner().getId().equals(userPrincipal.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User userToAdd = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        project.getMembers().add(userToAdd);
        Project updatedProject = projectRepository.save(project);
        return ResponseEntity.ok(updatedProject);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Project> removeMember(@PathVariable Long id, @PathVariable Long userId,
                                                @AuthenticationPrincipal UserPrincipal userPrincipal) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found: " + id));

        // Only owner can remove members
        if (!project.getOwner().getId().equals(userPrincipal.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        User userToRemove = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        project.getMembers().remove(userToRemove);
        Project updatedProject = projectRepository.save(project);
        return ResponseEntity.ok(updatedProject);
    }
}
