package com.pm.backend.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class AIService {

    public String predictPriority(String title, String description, Integer daysRemaining) {
        String text = (title + " " + (description != null ? description : "")).toLowerCase(Locale.ROOT);
        
        // Critical conditions
        if (text.contains("crash") || text.contains("critical") || text.contains("broken") || text.contains("production fail") || text.contains("security breach") || text.contains("vulnerability")) {
            return "CRITICAL";
        }
        
        // High conditions
        if (text.contains("login") || text.contains("auth") || text.contains("payment") || text.contains("db") || text.contains("database") || text.contains("error") || text.contains("bug") || text.contains("fix")) {
            return "HIGH";
        }
        
        // Due date proximity
        if (daysRemaining != null) {
            if (daysRemaining <= 1) {
                return "CRITICAL";
            } else if (daysRemaining <= 3) {
                return "HIGH";
            }
        }

        // Medium conditions
        if (text.contains("feature") || text.contains("build") || text.contains("implement") || text.contains("optimize") || text.contains("ui") || text.contains("refactor")) {
            return "MEDIUM";
        }

        // Default to low
        return "LOW";
    }

    public double estimateDuration(String title, String description, Integer assigneeExperience, int dependencyCount) {
        String text = (title + " " + (description != null ? description : "")).toLowerCase(Locale.ROOT);
        double baseHours = 4.0; // Default task takes half a day

        // Analyze complexity based on key tasks
        if (text.contains("setup") || text.contains("initialize")) {
            baseHours = 3.0;
        } else if (text.contains("crud") || text.contains("form") || text.contains("page")) {
            baseHours = 8.0;
        } else if (text.contains("auth") || text.contains("integration") || text.contains("api")) {
            baseHours = 12.0;
        } else if (text.contains("refactor") || text.contains("migration") || text.contains("redesign")) {
            baseHours = 16.0;
        } else if (text.contains("deploy") || text.contains("pipeline") || text.contains("security")) {
            baseHours = 20.0;
        }

        // Adjust for dependencies (each dependency adds weight)
        baseHours += (dependencyCount * 3.5);

        // Adjust for assignee experience (more experience = faster completion)
        if (assigneeExperience != null) {
            if (assigneeExperience >= 8) {
                baseHours *= 0.65; // Senior completes in 65% of base time
            } else if (assigneeExperience >= 4) {
                baseHours *= 0.85; // Mid level
            } else if (assigneeExperience <= 1) {
                baseHours *= 1.4;  // Junior takes longer
            }
        }

        // Clamp to logical values
        return Math.round(baseHours * 10.0) / 10.0;
    }

    public List<String> suggestSubtasks(String title, String description) {
        String text = (title + " " + (description != null ? description : "")).toLowerCase(Locale.ROOT);
        List<String> suggestions = new ArrayList<>();

        if (text.contains("login") || text.contains("auth") || text.contains("signup")) {
            suggestions.add("Design credentials entry interface");
            suggestions.add("Setup form validations (email/password)");
            suggestions.add("Implement JWT backend security controller");
            suggestions.add("Configure OAuth2 client flows");
            suggestions.add("Conduct vulnerability test against XSS");
        } else if (text.contains("database") || text.contains("db") || text.contains("schema")) {
            suggestions.add("Draft ER diagram connections");
            suggestions.add("Create Liquibase/Flyway schema migrations");
            suggestions.add("Configure table indexes for rapid search");
            suggestions.add("Setup Hibernate mappings and entities");
            suggestions.add("Run seeding scripts for initial mock data");
        } else if (text.contains("dashboard") || text.contains("chart") || text.contains("ui")) {
            suggestions.add("Build grid card structures");
            suggestions.add("Integrate Recharts visual widgets");
            suggestions.add("Verify dark/light theme styling layouts");
            suggestions.add("Add micro-animations on hover events");
            suggestions.add("Optimize responsiveness across mobile and tablet");
        } else if (text.contains("chat") || text.contains("message")) {
            suggestions.add("Configure WebSocket channel endpoints");
            suggestions.add("Design chat bubbles with glassmorphic cards");
            suggestions.add("Add file attachments database bindings");
            suggestions.add("Implement typing indicator hooks");
            suggestions.add("Integrate emoji picker library");
        } else {
            // General task suggestions
            suggestions.add("Clarify implementation specifications");
            suggestions.add("Write unit test cases using JUnit/Jest");
            suggestions.add("Conduct code review with team members");
            suggestions.add("Deploy changes to staging domain");
            suggestions.add("Document technical specifications and notes");
        }

        return suggestions;
    }
}
