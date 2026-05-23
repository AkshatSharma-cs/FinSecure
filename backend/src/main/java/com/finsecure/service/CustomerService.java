package com.finsecure.service;

import com.finsecure.dto.*;
import com.finsecure.entity.*;
import com.finsecure.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for customer profile, account, loan, and KYC workflows.
 *
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {

    private final CustomerRepository     customerRepository;
    private final AccountRepository      accountRepository;
    private final TransactionRepository  transactionRepository;
    private final LoanRepository         loanRepository;
    private final KycDocumentRepository  kycDocumentRepository;
    private final NotificationService    notificationService;
    private final TransactionService     transactionService;
    private final CardService            cardService;
    private final EmailService           emailService;
    private final AuditService           auditService;

    // ── Profile / Dashboard ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CustomerProfileResponse getProfile(String email) {
        return mapCustomerToProfile(findCustomerByEmail(email));
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(String email) {
        Customer customer = findCustomerByEmail(email);
        List<Account> accounts = accountRepository.findByCustomerIdAndStatus(
                customer.getId(), Account.AccountStatus.ACTIVE);

        BigDecimal totalBalance = accounts.stream()
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<TransactionResponse> recentTxns = accounts.stream()
                .flatMap(acc -> transactionRepository
                        .findRecentByAccountId(acc.getId(), PageRequest.of(0, 5)).stream())
                .map(this::mapTransactionToResponse)
                .limit(10)
                .collect(Collectors.toList());

        int activeLoans = (int) loanRepository.findByCustomerId(customer.getId()).stream()
                .filter(l -> l.getStatus() == Loan.LoanStatus.ACTIVE ||
                             l.getStatus() == Loan.LoanStatus.DISBURSED)
                .count();

        return DashboardResponse.builder()
                .profile(mapCustomerToProfile(customer))
                .totalBalance(totalBalance)
                .totalAccounts(accounts.size())
                .activeLoans(activeLoans)
                .activeCards(0)
                .unreadNotifications(notificationService.getUnreadCount(customer.getUser().getId()))
                .accounts(accounts.stream().map(this::mapAccountToResponse).collect(Collectors.toList()))
                .recentTransactions(recentTxns)
                .build();
    }

    // ── Accounts ──────────────────────────────────────────────────────────────

    @Transactional
    public AccountResponse createAccount(CreateAccountRequest request, String email) {
        Customer customer = findCustomerByEmail(email);
        String accountNumber = "FINS" + System.currentTimeMillis();

        Account account = Account.builder()
                .accountNumber(accountNumber)
                .customer(customer)
                .accountType(request.getAccountType())
                .balance(BigDecimal.ZERO)
                .minimumBalance(BigDecimal.valueOf(500))
                .currency("INR")
                .status(Account.AccountStatus.ACTIVE)
                .ifscCode(request.getIfscCode() != null ? request.getIfscCode() : "FINS0001234")
                .branchName(request.getBranchName() != null ? request.getBranchName() : "Main Branch")
                .build();

        account = accountRepository.save(account);

        notificationService.createNotification(customer.getUser().getId(),
                Notification.NotificationType.ACCOUNT, "Account Opened",
                "Your " + request.getAccountType().name() + " account " + accountNumber + " has been created.",
                accountNumber, "ACCOUNT");

        return mapAccountToResponse(account);
    }

    // ── Loans ─────────────────────────────────────────────────────────────────

    @Transactional
    public LoanResponse applyForLoan(LoanApplicationRequest request, String email) {
        Customer customer = findCustomerByEmail(email);

        if (customer.getKycStatus() != Customer.KycStatus.APPROVED)
            throw new IllegalStateException("KYC must be approved to apply for a loan");

        BigDecimal interestRate = getLoanInterestRate(request.getLoanType());
        BigDecimal emi          = calculateEmi(request.getPrincipalAmount(), interestRate, request.getTenureMonths());
        BigDecimal totalInterest = emi.multiply(BigDecimal.valueOf(request.getTenureMonths()))
                .subtract(request.getPrincipalAmount());

        String loanNumber = "LN" + System.currentTimeMillis();

        Loan loan = loanRepository.save(Loan.builder()
                .loanNumber(loanNumber)
                .customer(customer)
                .loanType(request.getLoanType())
                .principalAmount(request.getPrincipalAmount())
                .interestRate(interestRate)
                .tenureMonths(request.getTenureMonths())
                .emiAmount(emi)
                .outstandingAmount(request.getPrincipalAmount())
                .totalInterest(totalInterest)
                .purpose(request.getPurpose())
                .status(Loan.LoanStatus.APPLIED)
                .build());

        notificationService.sendLoanNotification(customer.getUser().getId(), loanNumber, "APPLIED");
        emailService.sendLoanStatusEmail(customer.getUser().getEmail(), customer.getFirstName(), loanNumber, "APPLIED");

        return mapLoanToResponse(loan);
    }

    /**
     * Called by EmployeeService when a loan is approved.
     * Sets disbursement date and marks the loan active.
     */
    @Transactional
    public void approveAndDisburseLoan(Loan loan) {
        loan.setStatus(Loan.LoanStatus.ACTIVE);
        loan.setDisbursementDate(LocalDate.now());
        loan.setNextEmiDate(LocalDate.now().plusMonths(1));
        loanRepository.save(loan);

        log.info("Loan {} approved and disbursed", loan.getLoanNumber());
    }

    // ── KYC ───────────────────────────────────────────────────────────────────

    @Transactional
    public KycDocumentResponse uploadKycDocument(KycDocumentUploadRequest request, String email) {
        Customer customer = findCustomerByEmail(email);

        KycDocument document = kycDocumentRepository.save(KycDocument.builder()
                .customer(customer)
                .documentType(request.getDocumentType())
                .documentNumber(request.getDocumentNumber())
                .filePath(request.getFilePath())
                .fileName(request.getFileName())
                .mimeType(request.getMimeType())
                .status(KycDocument.DocumentStatus.UPLOADED)
                .build());

        if (customer.getKycStatus() == Customer.KycStatus.PENDING) {
            customer.setKycStatus(Customer.KycStatus.SUBMITTED);
            customerRepository.save(customer);
        }

        return mapKycToResponse(document);
    }

    @Transactional(readOnly = true)
    public List<KycDocumentResponse> getKycDocuments(String email) {
        return kycDocumentRepository.findByCustomerId(findCustomerByEmail(email).getId())
                .stream().map(this::mapKycToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<LoanResponse> getLoans(String email) {
        return loanRepository.findByCustomerId(findCustomerByEmail(email).getId())
                .stream().map(this::mapLoanToResponse).collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Customer findCustomerByEmail(String email) {
        return customerRepository.findByUserEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
    }

    private BigDecimal getLoanInterestRate(Loan.LoanType loanType) {
        return switch (loanType) {
            case HOME      -> BigDecimal.valueOf(8.5);
            case CAR       -> BigDecimal.valueOf(9.5);
            case PERSONAL  -> BigDecimal.valueOf(12.5);
            case EDUCATION -> BigDecimal.valueOf(7.5);
            case BUSINESS  -> BigDecimal.valueOf(11.0);
            case GOLD      -> BigDecimal.valueOf(10.0);
        };
    }

    private BigDecimal calculateEmi(BigDecimal principal, BigDecimal annualRate, int months) {
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP);
        BigDecimal onePlusR    = BigDecimal.ONE.add(monthlyRate);
        BigDecimal pow         = onePlusR.pow(months, MathContext.DECIMAL128);
        return principal.multiply(monthlyRate).multiply(pow)
                .divide(pow.subtract(BigDecimal.ONE), 2, RoundingMode.HALF_UP);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private CustomerProfileResponse mapCustomerToProfile(Customer c) {
        return CustomerProfileResponse.builder()
                .id(c.getId()).userId(c.getUser().getId())
                .email(c.getUser().getEmail()).username(c.getUser().getUsername())
                .firstName(c.getFirstName()).lastName(c.getLastName())
                .phone(c.getPhone()).dateOfBirth(c.getDateOfBirth())
                .panNumber(c.getPanNumber()).aadharNumber(c.getAadharNumber())
                .address(c.getAddress()).city(c.getCity())
                .state(c.getState()).pinCode(c.getPinCode())
                .kycStatus(c.getKycStatus()).emailVerified(c.getUser().getEmailVerified())
                .createdAt(c.getCreatedAt()).build();
    }

    private AccountResponse mapAccountToResponse(Account a) {
        return AccountResponse.builder()
                .id(a.getId()).accountNumber(a.getAccountNumber())
                .accountType(a.getAccountType()).balance(a.getBalance())
                .minimumBalance(a.getMinimumBalance()).currency(a.getCurrency())
                .status(a.getStatus()).ifscCode(a.getIfscCode())
                .branchName(a.getBranchName()).createdAt(a.getCreatedAt()).build();
    }

    private TransactionResponse mapTransactionToResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId()).referenceNumber(t.getReferenceNumber())
                .accountNumber(t.getAccount().getAccountNumber())
                .type(t.getType()).mode(t.getMode()).amount(t.getAmount())
                .balanceAfter(t.getBalanceAfter()).description(t.getDescription())
                .targetAccountNumber(t.getTargetAccountNumber())
                .status(t.getStatus()).createdAt(t.getCreatedAt()).build();
    }

    private LoanResponse mapLoanToResponse(Loan l) {
        return LoanResponse.builder()
                .id(l.getId()).loanNumber(l.getLoanNumber()).loanType(l.getLoanType())
                .principalAmount(l.getPrincipalAmount()).interestRate(l.getInterestRate())
                .tenureMonths(l.getTenureMonths()).emiAmount(l.getEmiAmount())
                .outstandingAmount(l.getOutstandingAmount()).totalInterest(l.getTotalInterest())
                .status(l.getStatus()).disbursementDate(l.getDisbursementDate())
                .nextEmiDate(l.getNextEmiDate()).purpose(l.getPurpose())
                .rejectionReason(l.getRejectionReason()).createdAt(l.getCreatedAt()).build();
    }

    private KycDocumentResponse mapKycToResponse(KycDocument d) {
        return KycDocumentResponse.builder()
                .id(d.getId()).customerId(d.getCustomer().getId())
                .customerName(d.getCustomer().getFirstName() + " " + d.getCustomer().getLastName())
                .documentType(d.getDocumentType()).documentNumber(d.getDocumentNumber())
                .status(d.getStatus()).rejectionReason(d.getRejectionReason())
                .verifiedAt(d.getVerifiedAt()).createdAt(d.getCreatedAt()).build();
    }
}
