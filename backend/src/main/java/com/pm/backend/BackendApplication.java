package com.pm.backend;

import com.pm.backend.model.Role;
import com.pm.backend.model.User;
import com.pm.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner initDemoUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			// Helper to create or update user
			java.util.function.Consumer<User> saveOrUpdate = u -> {
				User existing = userRepository.findByEmail(u.getEmail()).orElse(null);
				if (existing == null) {
					userRepository.save(u);
				} else {
					existing.setName(u.getName());
					existing.setDesignation(u.getDesignation());
					existing.setDepartment(u.getDepartment());
					existing.setExperience(u.getExperience());
					existing.setSkills(u.getSkills());
					existing.setRole(u.getRole());
					userRepository.save(existing);
				}
			};

			// Admin: Niranjan
			User niranjan = User.builder()
					.email("niranjan@pm.com")
					.password(passwordEncoder.encode("password123"))
					.name("Niranjan")
					.role(Role.ROLE_ADMIN)
					.designation("Engineering")
					.department("CSE")
					.experience(10)
					.skills("java html css react git github sql etc")
					.build();
			saveOrUpdate.accept(niranjan);

			User googleAdmin = User.builder()
					.email("google.user@pm.com")
					.password(passwordEncoder.encode("password123"))
					.name("Niranjan")
					.role(Role.ROLE_ADMIN)
					.designation("Engineering")
					.department("CSE")
					.experience(10)
					.skills("java html css react git github sql etc")
					.build();
			saveOrUpdate.accept(googleAdmin);

			// Employees: Ramesh, Rahul, Manju, Vinay
			User ramesh = User.builder()
					.email("ramesh@pm.com")
					.password(passwordEncoder.encode("password123"))
					.name("Ramesh")
					.role(Role.ROLE_EMPLOYEE)
					.designation("Software Developer")
					.department("Engineering")
					.experience(4)
					.skills("Java, Spring Boot, React, SQL")
					.build();
			saveOrUpdate.accept(ramesh);

			User msUser = User.builder()
					.email("ms.user@pm.com")
					.password(passwordEncoder.encode("password123"))
					.name("Ramesh")
					.role(Role.ROLE_EMPLOYEE)
					.designation("Software Developer")
					.department("Engineering")
					.experience(4)
					.skills("Java, Spring Boot, React, SQL")
					.build();
			saveOrUpdate.accept(msUser);

			User rahul = User.builder()
					.email("rahul@pm.com")
					.password(passwordEncoder.encode("password123"))
					.name("Rahul")
					.role(Role.ROLE_EMPLOYEE)
					.designation("Frontend Engineer")
					.department("Web Engineering")
					.experience(3)
					.skills("React, HTML, CSS, JavaScript, Git")
					.build();
			saveOrUpdate.accept(rahul);

			User manju = User.builder()
					.email("manju@pm.com")
					.password(passwordEncoder.encode("password123"))
					.name("Manju")
					.role(Role.ROLE_EMPLOYEE)
					.designation("Backend Engineer")
					.department("Engineering")
					.experience(5)
					.skills("Java, SQL, Spring Boot, GitHub")
					.build();
			saveOrUpdate.accept(manju);

			User vinay = User.builder()
					.email("vinay@pm.com")
					.password(passwordEncoder.encode("password123"))
					.name("Vinay")
					.role(Role.ROLE_EMPLOYEE)
					.designation("QA Engineer")
					.department("Quality Assurance")
					.experience(3)
					.skills("Testing, Automation, Java, Git")
					.build();
			saveOrUpdate.accept(vinay);
		};
	}
}
