package com.pm.backend.repository;

import com.pm.backend.model.ActivityLog;
import com.pm.backend.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findByProjectOrderByCreatedAtDesc(Project project);
    List<ActivityLog> findByUserIdOrderByCreatedAtDesc(Long userId);
}
