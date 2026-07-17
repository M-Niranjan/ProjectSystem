package com.pm.backend.controller;

import com.pm.backend.model.Role;
import com.pm.backend.model.User;
import com.pm.backend.repository.UserRepository;
import com.pm.backend.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final UserRepository userRepository;

    public TeamController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<User>> getAllMembers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_MANAGER')")
    public ResponseEntity<User> updateMemberRole(@PathVariable Long id, @RequestParam Role role,
                                                 @AuthenticationPrincipal UserPrincipal userPrincipal) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));

        // Prevent self role change to avoid lockouts
        if (user.getId().equals(userPrincipal.getId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }

        user.setRole(role);
        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN') or hasRole('ROLE_MANAGER')")
    public ResponseEntity<User> updateMemberDetails(@PathVariable Long id, @RequestBody User details) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));

        user.setName(details.getName());
        user.setEmail(details.getEmail());
        user.setDesignation(details.getDesignation());
        user.setDepartment(details.getDepartment());
        user.setRole(details.getRole());
        user.setSkills(details.getSkills());
        user.setExperience(details.getExperience());
        if (details.getProfilePhoto() != null) {
            user.setProfilePhoto(details.getProfilePhoto());
        }

        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }
}
