package com.pm.backend.controller;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Controller to handle SPA routing fallback for page refreshes.
 * Any request that results in 404 (and is not an /api/ or file request) is forwarded to /index.html.
 */
@Controller
public class SpaController implements ErrorController {

    @RequestMapping("/error")
    public String handleError(HttpServletRequest request) {
        String uri = (String) request.getAttribute("jakarta.servlet.error.request_uri");
        if (uri != null && !uri.startsWith("/api/") && !uri.startsWith("/uploads/") && !uri.contains(".")) {
            return "forward:/index.html";
        }
        return "error";
    }
}
