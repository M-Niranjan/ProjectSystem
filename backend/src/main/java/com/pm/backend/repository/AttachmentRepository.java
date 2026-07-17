package com.pm.backend.repository;

import com.pm.backend.model.Attachment;
import com.pm.backend.model.Project;
import com.pm.backend.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByTask(Task task);
    List<Attachment> findByProject(Project project);
}
