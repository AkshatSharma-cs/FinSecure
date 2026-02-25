package com.finsecure.service;

import com.finsecure.dto.*;
import com.finsecure.entity.*;
import com.finsecure.repository.*;
import com.finsecure.dto.DepositRequest;
import com.finsecure.dto.TransactionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeService {

    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final KycDocumentRepository kycDocumentRepository;
    private final LoanRepository loanRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditService auditService;
    private final TransactionService transactionService;

    @Transactional(readOnly = true)
    public Page<CustomerProfileResponse> getAllCustomers(Pageable pageable) {
        return customerRepository.findAll(pageable).map(this::mapToProfile);
    }

    @Transactional(readOnly = true)
    public Page<CustomerProfileResponse> searchCustomers(String name, Pageable pageable) {
        return customerRepository.searchByName(name, pageable).map(this::mapToProfile);
    }

    @Transactional(readOnly = true)
    public Page<KycDocumentResponse> getPendingKycDocuments(Pageable pageable) {
        return kycDocumentRepository.findPendingDocuments(pageable).map(this::mapKycToResponse);
    }

    @Transactional
    public KycDocumentResponse verifyKycDocument(KycVerificationRequest request, String employeeEmail) {
        KycDocument document = kycDocumentRepository.findById(request.getDocumentId())
            .orElseThrow(() -> new IllegalArgumentException("KYC document not found"));

        Employee employee = employeeRepository.findByUserId(
            document.getCustomer().getUser().getId())
            .orElse(null);

        // Find employee by email
        Employee emp = employeeRepository.findAll().stream()
            .filter(e -> e.getUser().getEmail().equals(employeeEmail))
            .findFirst().orElse(null);

        if ("APPROVE".equalsIgnoreCase(request.getAction())) {
            document.setStatus(KycDocument.DocumentStatus.APPROVED);
            document.setVerifiedAt(LocalDateTime.now());
            document.setVerifiedBy(emp);

            // Check if all required docs are approved
            Customer customer = document.getCustomer();
            long approvedDocs = kycDocumentRepository.countByCustomerIdAndStatus(
                customer.getId(), KycDocument.DocumentStatus.APPROVED);

            if (approvedDocs >= 1) {
                customer.setKycStatus(Customer.KycStatus.APPROVED);
                customerRepository.save(customer);
                notificationService.sendKycNotification(customer.getUser().getId(), "APPROVED");
                emailService.sendKycStatusEmail(customer.getUser().getEmail(),
                    customer.getFirstName(), "APPROVED", null);
            }
        } else if ("REJECT".equalsIgnoreCase(request.getAction())) {
            document.setStatus(KycDocument.DocumentStatus.REJECTED);
            document.setRejectionReason(request.getRejectionReason());
            document.setVerifiedBy(emp);

            notificationService.sendKycNotification(document.getCustomer().getUser().getId(), "REJECTED");
            emailService.sendKycStatusEmail(document.getCustomer().getUser().getEmail(),
                document.getCustomer().getFirstName(), "REJECTED", request.getRejectionReason());
        } else {
            throw new IllegalArgumentException("Invalid action. Use APPROVE or REJECT.");
        }

        document = kycDocumentRepository.save(document);
        return mapKycToResponse(document);
    }

    @Transactional(readOnly = true)
    public Page<LoanResponse> getPendingLoans(Pageable pageable) {
        return loanRepository.findPendingLoans(pageable).map(this::mapLoanToResponse);
    }

    @Transactional
    public LoanResponse reviewLoan(Long loanId, String action, String rejectionReason, String employeeEmail) {
        Loan loan = loanRepository.findById(loanId)
            .orElseThrow(() -> new IllegalArgumentException("Loan not found"));

        Employee emp = employeeRepository.findAll().stream()
            .filter(e -> e.getUser().getEmail().equals(employeeEmail))
            .findFirst().orElse(null);

        if ("APPROVE".equalsIgnoreCase(action)) {
            loan.setStatus(Loan.LoanStatus.APPROVED);
            loan.setReviewedBy(emp);
        } else if ("REJECT".equalsIgnoreCase(action)) {
            loan.setStatus(Loan.LoanStatus.REJECTED);
            loan.setRejectionReason(rejectionReason);
            loan.setReviewedBy(emp);
        } else {
            throw new IllegalArgumentException("Invalid action. Use APPROVE or REJECT.");
        }

        loan = loanRepository.save(loan);

        notificationService.sendLoanNotification(loan.getCustomer().getUser().getId(),
            loan.getLoanNumber(), action.toUpperCase());
        emailService.sendLoanStatusEmail(loan.getCustomer().getUser().getEmail(),
            loan.getCustomer().getFirstName(), loan.getLoanNumber(), action.toUpperCase());

        return mapLoanToResponse(loan);
    }

    private CustomerProfileResponse mapToProfile(Customer customer) {
        return CustomerProfileResponse.builder()
            .id(customer.getId())
            .userId(customer.getUser().getId())
            .email(customer.getUser().getEmail())
            .username(customer.getUser().getUsername())
            .firstName(customer.getFirstName())
            .lastName(customer.getLastName())
            .phone(customer.getPhone())
            .dateOfBirth(customer.getDateOfBirth())
            .panNumber(customer.getPanNumber())
            .kycStatus(customer.getKycStatus())
            .emailVerified(customer.getUser().getEmailVerified())
            .createdAt(customer.getCreatedAt())
            .build();
    }

    private KycDocumentResponse mapKycToResponse(KycDocument doc) {
        return KycDocumentResponse.builder()
            .id(doc.getId())
            .customerId(doc.getCustomer().getId())
            .customerName(doc.getCustomer().getFirstName() + " " + doc.getCustomer().getLastName())
            .documentType(doc.getDocumentType())
            .documentNumber(doc.getDocumentNumber())
            .status(doc.getStatus())
            .rejectionReason(doc.getRejectionReason())
            .verifiedAt(doc.getVerifiedAt())
            .createdAt(doc.getCreatedAt())
            .build();
    }

    private LoanResponse mapLoanToResponse(Loan loan) {
        return LoanResponse.builder()
            .id(loan.getId())
            .loanNumber(loan.getLoanNumber())
            .loanType(loan.getLoanType())
            .principalAmount(loan.getPrincipalAmount())
            .interestRate(loan.getInterestRate())
            .tenureMonths(loan.getTenureMonths())
            .emiAmount(loan.getEmiAmount())
            .outstandingAmount(loan.getOutstandingAmount())
            .totalInterest(loan.getTotalInterest())
            .status(loan.getStatus())
            .disbursementDate(loan.getDisbursementDate())
            .nextEmiDate(loan.getNextEmiDate())
            .purpose(loan.getPurpose())
            .rejectionReason(loan.getRejectionReason())
            .createdAt(loan.getCreatedAt())
            .build();
    }

    @Transactional
    public TransactionResponse depositToCustomerAccount(DepositRequest request, String employeeEmail) {
        // Verify employee exists
        employeeRepository.findAll().stream()
            .filter(e -> e.getUser().getEmail().equals(employeeEmail))
            .findFirst()
            .orElseThrow(() -> new SecurityException("Employee not found"));

        return transactionService.processDeposit(
            request.getAccountNumber(),
            request.getAmount(),
            request.getDescription() != null ? request.getDescription() : "Cash deposit by employee"
        );
    }

}