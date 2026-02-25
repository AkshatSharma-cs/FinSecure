package com.finsecure.controller;

import com.finsecure.dto.*;
import com.finsecure.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerController {

    private final CustomerService customerService;
    private final TransactionService transactionService;
    private final CardService cardService;
    private final NotificationService notificationService;

    // === PROFILE ===
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<CustomerProfileResponse>> getProfile(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getProfile(auth.getName()), "Profile retrieved"));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getDashboard(auth.getName()), "Dashboard loaded"));
    }

    // === ACCOUNTS ===
    @PostMapping("/accounts")
    public ResponseEntity<ApiResponse<AccountResponse>> createAccount(
            @Valid @RequestBody CreateAccountRequest request, Authentication auth) {
        AccountResponse account = customerService.createAccount(request, auth.getName());
        return ResponseEntity.status(201).body(ApiResponse.success(account, "Account created successfully"));
    }

    // === SELF-DEPOSIT ===
    @PostMapping("/accounts/deposit")
    public ResponseEntity<ApiResponse<TransactionResponse>> deposit(
            @Valid @RequestBody DepositRequest request, Authentication auth) {
        try {
            // Validate account belongs to user
            TransactionResponse txn = transactionService.processSelfDeposit(
                request.getAccountNumber(), request.getAmount(),
                request.getDescription(), auth.getName());
            return ResponseEntity.ok(ApiResponse.success(txn, "Deposit successful"));
        } catch (IllegalStateException | IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "DEPOSIT_FAILED"));
        }
    }

    // === TRANSACTIONS ===
    @PostMapping("/transactions/transfer")
    public ResponseEntity<ApiResponse<TransactionResponse>> transfer(
            @Valid @RequestBody TransactionRequest request, Authentication auth) {
        try {
            TransactionResponse txn = transactionService.processTransfer(request, auth.getName());
            return ResponseEntity.ok(ApiResponse.success(txn, "Transaction successful"));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "TRANSACTION_FAILED"));
        }
    }

    @GetMapping("/transactions/{accountId}")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> getTransactions(
            @PathVariable Long accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TransactionResponse> txns = transactionService.getTransactionHistory(
            accountId, PageRequest.of(page, size, Sort.by("createdAt").descending()));
        return ResponseEntity.ok(ApiResponse.success(txns, "Transactions retrieved"));
    }

    // === LOANS ===
    @PostMapping("/loans/apply")
    public ResponseEntity<ApiResponse<LoanResponse>> applyForLoan(
            @Valid @RequestBody LoanApplicationRequest request, Authentication auth) {
        try {
            LoanResponse loan = customerService.applyForLoan(request, auth.getName());
            return ResponseEntity.status(201).body(ApiResponse.success(loan, "Loan application submitted"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "LOAN_FAILED"));
        }
    }

    @GetMapping("/loans")
    public ResponseEntity<ApiResponse<List<LoanResponse>>> getLoans(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getLoans(auth.getName()), "Loans retrieved"));
    }

    // === CARDS ===
    @GetMapping("/cards")
    public ResponseEntity<ApiResponse<List<CardResponse>>> getCards(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(cardService.getCustomerCards(auth.getName()), "Cards retrieved"));
    }

    @PostMapping("/cards/{accountId}/issue-debit")
    public ResponseEntity<ApiResponse<CardResponse>> issueDebitCard(
            @PathVariable Long accountId, Authentication auth) {
        try {
            CardResponse card = cardService.issueDebitCard(accountId, auth.getName());
            return ResponseEntity.status(201).body(ApiResponse.success(card, "Debit card issued"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "CARD_FAILED"));
        }
    }

    @PostMapping("/cards/{accountId}/issue-virtual-debit")
    public ResponseEntity<ApiResponse<CardResponse>> issueVirtualDebitCard(
            @PathVariable Long accountId, Authentication auth) {
        try {
            CardResponse card = cardService.issueVirtualDebitCard(accountId, auth.getName());
            return ResponseEntity.status(201).body(ApiResponse.success(card, "Virtual debit card issued"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "CARD_FAILED"));
        }
    }

    @PostMapping("/cards/issue-credit")
    public ResponseEntity<ApiResponse<CardResponse>> issueCreditCard(
            @Valid @RequestBody IssueCreditCardRequest request, Authentication auth) {
        try {
            CardResponse card = cardService.issueCreditCard(request, auth.getName());
            return ResponseEntity.status(201).body(ApiResponse.success(card, "Credit card issued"));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "CARD_FAILED"));
        }
    }

    @PostMapping("/cards/issue-prepaid")
    public ResponseEntity<ApiResponse<CardResponse>> issuePrepaidCard(
            @Valid @RequestBody IssuePrepaidCardRequest request, Authentication auth) {
        try {
            CardResponse card = cardService.issuePrepaidCard(request, auth.getName());
            return ResponseEntity.status(201).body(ApiResponse.success(card, "Prepaid card issued"));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "CARD_FAILED"));
        }
    }

    @PostMapping("/cards/action")
    public ResponseEntity<ApiResponse<CardResponse>> performCardAction(
            @Valid @RequestBody CardActionRequest request, Authentication auth) {
        try {
            CardResponse card = cardService.performCardAction(request, auth.getName());
            return ResponseEntity.ok(ApiResponse.success(card, "Card action performed"));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "CARD_ACTION_FAILED"));
        }
    }

    // === KYC ===
    @PostMapping("/kyc/upload")
    public ResponseEntity<ApiResponse<KycDocumentResponse>> uploadKycDocument(
            @Valid @RequestBody KycDocumentUploadRequest request, Authentication auth) {
        KycDocumentResponse doc = customerService.uploadKycDocument(request, auth.getName());
        return ResponseEntity.status(201).body(ApiResponse.success(doc, "Document uploaded successfully"));
    }

    @GetMapping("/kyc/documents")
    public ResponseEntity<ApiResponse<List<KycDocumentResponse>>> getKycDocuments(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getKycDocuments(auth.getName()), "Documents retrieved"));
    }

    // === NOTIFICATIONS ===
    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotifications(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<NotificationResponse> notifications = Page.empty();
        return ResponseEntity.ok(ApiResponse.success(notifications, "Notifications retrieved"));
    }

    @PostMapping("/notifications/read-all")
    public ResponseEntity<ApiResponse<String>> markAllNotificationsRead(Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read"));
    }
}
