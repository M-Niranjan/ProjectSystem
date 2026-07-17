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
			if (!userRepository.findByEmail("google.user@pm.com").isPresent()) {
				User leader = User.builder()
						.email("google.user@pm.com")
						.password(passwordEncoder.encode("password123"))
						.name("Google Associate")
						.role(Role.ROLE_MANAGER)
						.designation("Enterprise Architect")
						.department("Tech Operations")
						.experience(10)
						.build();
				userRepository.save(leader);
			}

			if (!userRepository.findByEmail("ms.user@pm.com").isPresent()) {
				User employee = User.builder()
						.email("ms.user@pm.com")
						.password(passwordEncoder.encode("password123"))
						.name("Microsoft Executive")
						.role(Role.ROLE_EMPLOYEE)
						.designation("Senior Dev")
						.department("Web Engineering")
						.experience(5)
						.build();
				userRepository.save(employee);
			}
		};
	}
}
