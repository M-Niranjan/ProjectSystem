package com.pm.backend.repository;

import com.pm.backend.model.Project;
import com.pm.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByOwnerOrMembersContains(User owner, User member);
    List<Project> findByIsFavoriteTrueAndOwnerOrMembersContains(User owner, User member);
}
