package com.pm.backend.controller;

import com.pm.backend.model.User;
import com.pm.backend.repository.UserRepository;
import com.pm.backend.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserProfile(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody User profileDetails,
                                              @AuthenticationPrincipal UserPrincipal userPrincipal) {
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("Current user not found"));

        if (profileDetails.getEmail() != null && !profileDetails.getEmail().trim().isEmpty()) {
            String newEmail = profileDetails.getEmail().trim();
            if (!newEmail.equalsIgnoreCase(user.getEmail())) {
                boolean exists = userRepository.existsByEmail(newEmail);
                if (exists) {
                    return ResponseEntity.badRequest().body("Email address already in use by another user!");
                }
                user.setEmail(newEmail);
            }
        }
        if (profileDetails.getName() != null) user.setName(profileDetails.getName());
        if (profileDetails.getDesignation() != null) user.setDesignation(profileDetails.getDesignation());
        if (profileDetails.getDepartment() != null) user.setDepartment(profileDetails.getDepartment());
        if (profileDetails.getExperience() != null) user.setExperience(profileDetails.getExperience());
        if (profileDetails.getSkills() != null) user.setSkills(profileDetails.getSkills());
        if (profileDetails.getProfilePhoto() != null) user.setProfilePhoto(profileDetails.getProfilePhoto());
        if (profileDetails.getPhone() != null) user.setPhone(profileDetails.getPhone());
        if (profileDetails.getGithubUrl() != null) user.setGithubUrl(profileDetails.getGithubUrl());
        if (profileDetails.getPortfolioUrl() != null) user.setPortfolioUrl(profileDetails.getPortfolioUrl());
        if (profileDetails.getBio() != null) user.setBio(profileDetails.getBio());
        if (profileDetails.getEducation() != null) user.setEducation(profileDetails.getEducation());
        if (profileDetails.getResumeBase64() != null) user.setResumeBase64(profileDetails.getResumeBase64());
        if (profileDetails.getResumeFileName() != null) user.setResumeFileName(profileDetails.getResumeFileName());

        if (profileDetails.getPassword() != null && !profileDetails.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(profileDetails.getPassword().trim()));
        }

        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }
}
