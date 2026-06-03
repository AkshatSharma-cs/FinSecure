package com.finsecure.service;

import com.finsecure.dto.*;
import com.finsecure.entity.*;
import com.finsecure.entity.Otp.OtpPurpose;
import com.finsecure.entity.User.Role;
import com.finsecure.repository.*;
import com.finsecure.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final OtpRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final CustomUserDetailsService userDetailsService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Value("${app.otp.expiration-minutes:5}")
    private int otpExpirationMinutes;

    @Transactional
    public ApiResponse<String> register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ApiResponse.error("Email already registered", "EMAIL_EXISTS");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            return ApiResponse.error("Username already taken", "USERNAME_EXISTS");
        }
        if (request.getPanNumber() != null && customerRepository.existsByPanNumber(request.getPanNumber())) {
            return ApiResponse.error("PAN number already registered", "PAN_EXISTS");
        }

        User user = User.builder()
            .email(request.getEmail())
            .username(request.getUsername())
            .password(passwordEncoder.encode(request.getPassword()))
            .role(Role.ROLE_CUSTOMER)
            .active(true)
            .emailVerified(false)   // must verify before login
            .build();

        user = userRepository.save(user);

        Customer customer = Customer.builder()
            .user(user)
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .phone(request.getPhone())
            .dateOfBirth(request.getDateOfBirth())
            .panNumber(request.getPanNumber())
            .aadharNumber(request.getAadharNumber())
            .address(request.getAddress())
            .city(request.getCity())
            .state(request.getState())
            .pinCode(request.getPinCode())
            .kycStatus(Customer.KycStatus.PENDING)
            .build();

        customerRepository.save(customer);

        // Send welcome email and OTP
        emailService.sendWelcomeEmail(request.getEmail(), request.getFirstName());
        generateAndSendOtp(request.getEmail(), OtpPurpose.EMAIL_VERIFICATION);

        auditService.logSuccess(user.getId(), user.getUsername(), "REGISTER", "USER",
            user.getId().toString(), "New customer registered — email verification pending");

        return ApiResponse.success("Registration successful. Please enter the OTP sent to " + request.getEmail() + " to verify your account.");
    }

    @Transactional
    public ApiResponse<LoginResponse> login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getIdentifier(), request.getPassword())
            );

            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

            // ── Block login if email not verified ───────────────────────────
            if (user.getRole() == Role.ROLE_CUSTOMER && !Boolean.TRUE.equals(user.getEmailVerified())) {
                // Re-send OTP so user can verify
                generateAndSendOtp(user.getEmail(), OtpPurpose.EMAIL_VERIFICATION);
                auditService.logFailure(user.getId(), user.getUsername(), "LOGIN", "AUTH",
                    null, "Login blocked — email not verified");
                return ApiResponse.error(
                    "EMAIL_NOT_VERIFIED:" + user.getEmail(),
                    "EMAIL_NOT_VERIFIED"
                );
            }

            String token = jwtUtil.generateToken(userDetails);

            auditService.logSuccess(user.getId(), user.getUsername(), "LOGIN", "AUTH",
                null, "Successful login");

            LoginResponse response = LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getExpirationMs())
                .role(user.getRole().name())
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .otpRequired(false)
                .build();

            return ApiResponse.success(response, "Login successful");

        } catch (Exception e) {
            // Don't expose email-not-verified error code through the catch block
            String msg = e.getMessage();
            if (msg != null && msg.contains("EMAIL_NOT_VERIFIED")) throw e;
            auditService.logFailure(null, request.getIdentifier(), "LOGIN", "AUTH", null, msg);
            return ApiResponse.error("Invalid credentials", "INVALID_CREDENTIALS");
        }
    }

    @Transactional
    public ApiResponse<String> sendOtp(OtpRequest request) {
        if (!userRepository.existsByEmail(request.getEmail())) {
            return ApiResponse.error("Email not registered", "EMAIL_NOT_FOUND");
        }
        generateAndSendOtp(request.getEmail(), request.getPurpose());
        return ApiResponse.success("OTP sent to " + request.getEmail());
    }

    @Transactional
    public ApiResponse<String> verifyOtp(OtpVerificationRequest request) {
        Otp otp = otpRepository.findValidOtp(request.getEmail(), request.getPurpose(), LocalDateTime.now())
            .orElse(null);

        if (otp == null) {
            return ApiResponse.error("Invalid or expired OTP. Request a new one.", "INVALID_OTP");
        }

        if (!otp.getOtpCode().equals(request.getOtpCode())) {
            otp.setAttemptCount(otp.getAttemptCount() + 1);
            otpRepository.save(otp);
            int remaining = 5 - otp.getAttemptCount();
            return ApiResponse.error("Incorrect OTP. " + (remaining > 0 ? remaining + " attempts remaining." : "Please request a new OTP."), "WRONG_OTP");
        }

        otp.setUsed(true);
        otpRepository.save(otp);

        if (request.getPurpose() == OtpPurpose.EMAIL_VERIFICATION) {
            userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
                user.setEmailVerified(true);
                userRepository.save(user);
                log.info("Email verified for user: {}", user.getEmail());
            });
        }

        return ApiResponse.success("Email verified successfully. You can now log in.");
    }

    @Transactional
    public ApiResponse<String> forgotPassword(String email) {
        if (!userRepository.existsByEmail(email)) {
            return ApiResponse.success("If this email is registered, you will receive a password reset OTP.");
        }
        generateAndSendOtp(email, OtpPurpose.PASSWORD_RESET);
        return ApiResponse.success("Password reset OTP sent to " + email + ". Valid for 5 minutes.");
    }

    @Transactional
    public ApiResponse<String> resetPassword(ResetPasswordRequest request) {
        Otp otp = otpRepository.findValidOtp(request.getEmail(), OtpPurpose.PASSWORD_RESET, LocalDateTime.now())
            .orElse(null);

        if (otp == null) {
            return ApiResponse.error("Invalid or expired OTP. Please request a new one.", "INVALID_OTP");
        }
        if (!otp.getOtpCode().equals(request.getOtpCode())) {
            otp.setAttemptCount(otp.getAttemptCount() + 1);
            otpRepository.save(otp);
            return ApiResponse.error("Incorrect OTP. Please try again.", "WRONG_OTP");
        }

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        otp.setUsed(true);
        otpRepository.save(otp);

        emailService.sendPasswordChangedEmail(request.getEmail(), user.getUsername());
        auditService.logSuccess(user.getId(), user.getUsername(), "PASSWORD_RESET", "USER",
            user.getId().toString(), "Password reset via OTP");

        return ApiResponse.success("Password reset successfully. You can now log in with your new password.");
    }

    private void generateAndSendOtp(String email, OtpPurpose purpose) {
        otpRepository.invalidatePreviousOtps(email, purpose);

        String otpCode = generateOtpCode();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(otpExpirationMinutes);

        Otp otp = Otp.builder()
            .email(email)
            .otpCode(otpCode)
            .purpose(purpose)
            .expiresAt(expiresAt)
            .used(false)
            .attemptCount(0)
            .build();

        otpRepository.save(otp);
        emailService.sendOtpEmail(email, otpCode, purpose.name().replace("_", " "));
    }

    private String generateOtpCode() {
        return String.format("%06d", new SecureRandom().nextInt(1000000));
    }
}
