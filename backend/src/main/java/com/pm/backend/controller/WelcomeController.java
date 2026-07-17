package com.pm.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class WelcomeController {

    @GetMapping("/")
    public Map<String, Object> welcome() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "Prologue SaaS API Server is Live 🚀");
        status.put("version", "0.0.1-SNAPSHOT");
        status.put("database", "Connected (pm_db)");
        status.put("clientUrl", "http://localhost:5173");
        status.put("health", "UP");
        return status;
    }
}
