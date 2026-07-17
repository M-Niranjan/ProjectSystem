package com.pm.backend.repository;

import com.pm.backend.model.Project;
import com.pm.backend.model.Task;
import com.pm.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProject(Project project);
    List<Task> findByAssignee(User assignee);
    List<Task> findByProjectAndParentTaskIsNull(Project project);
    List<Task> findByDueDateBetween(LocalDate start, LocalDate end);
    List<Task> findByAssigneeAndDueDate(User assignee, LocalDate date);
}
