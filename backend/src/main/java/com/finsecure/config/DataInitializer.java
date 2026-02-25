package com.finsecure.config;

import com.finsecure.entity.Customer;
import com.finsecure.entity.Employee;
import com.finsecure.entity.User;
import com.finsecure.repository.CustomerRepository;
import com.finsecure.repository.EmployeeRepository;
import com.finsecure.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedAdmin();
        seedEmployee();
        seedCustomer();
    }

    private void seedAdmin() {
        if (userRepository.existsByEmail("admin@finsecure.com")) return;

        User user = User.builder()
            .email("admin@finsecure.com")
            .username("admin")
            .password(passwordEncoder.encode("Admin@1234"))
            .role(User.Role.ROLE_ADMIN)
            .active(true)
            .emailVerified(true)
            .build();

        userRepository.save(user);
        log.info("✅ Admin user seeded: admin@finsecure.com / Admin@1234");
    }

    private void seedEmployee() {
        if (userRepository.existsByEmail("emp1@finsecure.com")) return;

        User user = User.builder()
            .email("emp1@finsecure.com")
            .username("emp.ram")
            .password(passwordEncoder.encode("Employee@1234"))
            .role(User.Role.ROLE_EMPLOYEE)
            .active(true)
            .emailVerified(true)
            .build();

        user = userRepository.save(user);

        Employee employee = Employee.builder()
            .user(user)
            .employeeId("EMP001")
            .firstName("Ram")
            .lastName("Kumar")
            .phone("9876543210")
            .joiningDate(LocalDate.of(2023, 1, 15))
            .department(Employee.Department.KYC)
            .status(Employee.EmployeeStatus.ACTIVE)
            .build();

        employeeRepository.save(employee);
        log.info("✅ Employee user seeded: emp1@finsecure.com / Employee@1234");
    }

    private void seedCustomer() {
        if (userRepository.existsByEmail("priya@gmail.com")) return;

        User user = User.builder()
            .email("priya@gmail.com")
            .username("priya.sharma")
            .password(passwordEncoder.encode("Customer@1234"))
            .role(User.Role.ROLE_CUSTOMER)
            .active(true)
            .emailVerified(true)
            .build();

        user = userRepository.save(user);

        Customer customer = Customer.builder()
            .user(user)
            .firstName("Priya")
            .lastName("Sharma")
            .phone("9988776655")
            .dateOfBirth(LocalDate.of(1992, 5, 15))
            .panNumber("ABCPS1234P")
            .aadharNumber("123456789012")
            .address("42 MG Road")
            .city("Bangalore")
            .state("Karnataka")
            .pinCode("560001")
            .kycStatus(Customer.KycStatus.APPROVED)
            .build();

        customerRepository.save(customer);
        log.info("✅ Customer user seeded: priya@gmail.com / Customer@1234");
    }
}
