package com.pm.backend.controller;

import com.pm.backend.model.User;
import com.pm.backend.repository.UserRepository;
import com.pm.backend.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserProfile(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found: " + id));
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<User> updateProfile(@RequestBody User profileDetails,
                                              @AuthenticationPrincipal UserPrincipal userPrincipal) {
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("Current user not found"));

        System.out.println("Updating user profile name from '" + user.getName() + "' to '" + profileDetails.getName() + "'");
        user.setName(profileDetails.getName());
        user.setDesignation(profileDetails.getDesignation());
        user.setDepartment(profileDetails.getDepartment());
        user.setExperience(profileDetails.getExperience());
        user.setSkills(profileDetails.getSkills());
        if (profileDetails.getProfilePhoto() != null) {
            user.setProfilePhoto(profileDetails.getProfilePhoto());
        }
        user.setPhone(profileDetails.getPhone());
        user.setGithubUrl(profileDetails.getGithubUrl());
        user.setPortfolioUrl(profileDetails.getPortfolioUrl());
        user.setBio(profileDetails.getBio());
        user.setEducation(profileDetails.getEducation());
        user.setResumeBase64(profileDetails.getResumeBase64());
        user.setResumeFileName(profileDetails.getResumeFileName());

        User updatedUser = userRepository.save(user);
        return ResponseEntity.ok(updatedUser);
    }
}
