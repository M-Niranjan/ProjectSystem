package com.pm.backend.controller;

import com.pm.backend.model.Project;
import com.pm.backend.model.Task;
import com.pm.backend.repository.ProjectRepository;
import com.pm.backend.repository.TaskRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;

    public ReportController(ProjectRepository projectRepository, TaskRepository taskRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        Map<String, Object> data = new HashMap<>();

        List<Project> projects = projectRepository.findAll();
        List<Task> tasks = taskRepository.findAll();

        long totalProjects = projects.size();
        long activeProjects = projects.stream().filter(p -> "ACTIVE".equals(p.getStatus())).count();
        long completedProjects = projects.stream().filter(p -> "COMPLETED".equals(p.getStatus())).count();

        long totalTasks = tasks.size();
        long completedTasks = tasks.stream().filter(t -> "COMPLETED".equals(t.getStatus())).count();
        long pendingTasks = totalTasks - completedTasks;

        // Status distribution
        Map<String, Long> statusDistribution = new HashMap<>();
        statusDistribution.put("BACKLOG", tasks.stream().filter(t -> "BACKLOG".equals(t.getStatus())).count());
        statusDistribution.put("TO_DO", tasks.stream().filter(t -> "TO_DO".equals(t.getStatus())).count());
        statusDistribution.put("IN_PROGRESS", tasks.stream().filter(t -> "IN_PROGRESS".equals(t.getStatus())).count());
        statusDistribution.put("TESTING", tasks.stream().filter(t -> "TESTING".equals(t.getStatus())).count());
        statusDistribution.put("REVIEW", tasks.stream().filter(t -> "REVIEW".equals(t.getStatus())).count());
        statusDistribution.put("COMPLETED", completedTasks);

        // Priority distribution
        Map<String, Long> priorityDistribution = new HashMap<>();
        priorityDistribution.put("LOW", tasks.stream().filter(t -> "LOW".equals(t.getPriority())).count());
        priorityDistribution.put("MEDIUM", tasks.stream().filter(t -> "MEDIUM".equals(t.getPriority())).count());
        priorityDistribution.put("HIGH", tasks.stream().filter(t -> "HIGH".equals(t.getPriority())).count());
        priorityDistribution.put("CRITICAL", tasks.stream().filter(t -> "CRITICAL".equals(t.getPriority())).count());

        data.put("totalProjects", totalProjects);
        data.put("activeProjects", activeProjects);
        data.put("completedProjects", completedProjects);
        data.put("totalTasks", totalTasks);
        data.put("completedTasks", completedTasks);
        data.put("pendingTasks", pendingTasks);
        data.put("statusDistribution", statusDistribution);
        data.put("priorityDistribution", priorityDistribution);
        data.put("productivityScore", totalTasks > 0 ? (int) (((double) completedTasks / totalTasks) * 100) : 100);

        return ResponseEntity.ok(data);
    }

    @GetMapping("/project/{projectId}/pdf")
    public ResponseEntity<byte[]> downloadPdfReport(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        String content = "%PDF-1.4\n" +
                "1 0 obj < < /Type /Catalog /Pages 2 0 R > > endobj\n" +
                "2 0 obj < < /Type /Pages /Kids [ 3 0 R ] /Count 1 > > endobj\n" +
                "3 0 obj < < /Type /Page /Parent 2 0 R /Resources < < /Font < < /F1 4 0 R > > > > /Contents 5 0 R > > endobj\n" +
                "4 0 obj < < /Type /Font /Subtype /Type1 /BaseFont /Helvetica > > endobj\n" +
                "5 0 obj < < /Length 150 > > stream\n" +
                "BT\n" +
                "/F1 18 Tf\n" +
                "50 750 Td\n" +
                "(Project: " + project.getName() + " Analytics Report) Tj\n" +
                "0 -30 Td\n" +
                "/F1 12 Tf\n" +
                "(Status: " + project.getStatus() + ") Tj\n" +
                "0 -20 Td\n" +
                "(Priority: " + project.getPriority() + ") Tj\n" +
                "0 -20 Td\n" +
                "(Budget: $" + project.getBudget() + " | Spent: $" + project.getSpent() + ") Tj\n" +
                "ET\n" +
                "endstream\n" +
                "endobj\n" +
                "xref\n" +
                "0 6\n" +
                "0000000000 65535 f\n" +
                "0000000009 00000 n\n" +
                "0000000056 00000 n\n" +
                "0000000111 00000 n\n" +
                "0000000212 00000 n\n" +
                "0000000293 00000 n\n" +
                "trailer < < /Size 6 /Root 1 0 R > >\n" +
                "startxref\n" +
                "490\n" +
                "%%EOF";

        byte[] pdfBytes = content.getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Project_Report_" + projectId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/project/{projectId}/excel")
    public ResponseEntity<byte[]> downloadExcelReport(@PathVariable Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        StringBuilder csv = new StringBuilder();
        csv.append("Project ID,Project Name,Status,Priority,Budget,Spent,Deadline\n");
        csv.append(project.getId()).append(",")
                .append("\"").append(project.getName()).append("\",")
                .append(project.getStatus()).append(",")
                .append(project.getPriority()).append(",")
                .append(project.getBudget()).append(",")
                .append(project.getSpent()).append(",")
                .append(project.getDeadline()).append("\n");

        byte[] csvBytes = csv.toString().getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Project_Report_" + projectId + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvBytes);
    }
}
