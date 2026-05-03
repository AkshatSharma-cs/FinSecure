package com.finsecure.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.simulation:true}")
    private boolean simulationMode;

    @Value("${spring.mail.username:no-reply@finsecure.com}")
    private String fromEmail;

    @Async
    public void sendOtpEmail(String to, String otp, String purpose) {
        String subject = "FinSecure - OTP for " + purpose;
        String body = buildOtpEmailBody(otp, purpose);
        sendEmail(to, subject, body);
    }

    @Async
    public void sendWelcomeEmail(String to, String firstName) {
        String subject = "Welcome to FinSecure!";
        String body = String.format("""
            Dear %s,
            
            Welcome to FinSecure - Your trusted banking partner!
            
            Your account has been successfully created. Please complete your KYC verification to unlock all features.
            
            Best regards,
            FinSecure Team
            """, firstName);
        sendEmail(to, subject, body);
    }

    @Async
    public void sendTransactionAlert(String to, String accountNumber, String amount, String type, String balance) {
        String subject = "FinSecure - Transaction Alert";
        String body = String.format("""
            Dear Customer,
            
            A %s of Rs. %s has been made on your account %s.
            
            Available Balance: Rs. %s
            
            If you did not authorize this transaction, please contact us immediately at 1800-XXX-XXXX.
            
            Best regards,
            FinSecure Team
            """, type, amount, accountNumber, balance);
        sendEmail(to, subject, body);
    }

    @Async
    public void sendKycStatusEmail(String to, String firstName, String status, String reason) {
        String subject = "FinSecure - KYC Status Update";
        String body = String.format("""
            Dear %s,
            
            Your KYC verification status has been updated to: %s
            %s
            
            Best regards,
            FinSecure Team
            """, firstName, status, reason != null ? "Reason: " + reason : "");
        sendEmail(to, subject, body);
    }

    @Async
    public void sendLoanStatusEmail(String to, String firstName, String loanNumber, String status) {
        String subject = "FinSecure - Loan Application Update";
        String body = String.format("""
            Dear %s,
            
            Your loan application %s status has been updated to: %s
            
            Please log in to your FinSecure account for more details.
            
            Best regards,
            FinSecure Team
            """, firstName, loanNumber, status);
        sendEmail(to, subject, body);
    }

    private void sendEmail(String to, String subject, String body) {
        if (simulationMode) {
            log.info("=== EMAIL SIMULATION ===");
            log.info("To: {}", to);
            log.info("Subject: {}", subject);
            log.info("Body: {}", body);
            log.info("======================");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent successfully to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send email to {}: {}", to, e.getMessage());
        }
    }

    public void sendPasswordChangedEmail(String to, String username) {
        String subject = "FinSecure — Your Password Has Been Changed";
        String body = String.format("""
            Dear %s,
            
            Your FinSecure account password has been successfully reset.
            
            If you did not make this change, please contact our support team immediately and secure your account.
            
            For security, we recommend:
            - Never share your password with anyone
            - Use a strong, unique password
            - Enable two-factor authentication
            
            Best regards,
            FinSecure Security Team
            """, username);
        sendEmail(to, subject, body);
    }

    private String buildOtpEmailBody(String otp, String purpose) {
        return String.format("""
            Dear Customer,
            
            Your OTP for %s is: %s
            
            This OTP is valid for 5 minutes. Do not share it with anyone.
            
            If you did not request this OTP, please contact us immediately.
            
            Best regards,
            FinSecure Team
            """, purpose, otp);
    }
}
