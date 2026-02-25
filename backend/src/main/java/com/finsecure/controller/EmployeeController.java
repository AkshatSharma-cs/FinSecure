package com.finsecure.controller;

import com.finsecure.dto.*;
import com.finsecure.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import com.finsecure.dto.DepositRequest;
import com.finsecure.dto.TransactionResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/employee")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('EMPLOYEE', 'ADMIN')")
public class EmployeeController {

    private final EmployeeService employeeService;

    // === CUSTOMER MANAGEMENT ===
    @GetMapping("/customers")
    public ResponseEntity<ApiResponse<Page<CustomerProfileResponse>>> getAllCustomers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<CustomerProfileResponse> customers = search != null && !search.isBlank()
            ? employeeService.searchCustomers(search, pageable)
            : employeeService.getAllCustomers(pageable);

        return ResponseEntity.ok(ApiResponse.success(customers, "Customers retrieved"));
    }

    // === KYC ===
    @GetMapping("/kyc/pending")
    public ResponseEntity<ApiResponse<Page<KycDocumentResponse>>> getPendingKyc(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<KycDocumentResponse> docs = employeeService.getPendingKycDocuments(
            PageRequest.of(page, size, Sort.by("createdAt").ascending()));
        return ResponseEntity.ok(ApiResponse.success(docs, "Pending KYC documents retrieved"));
    }

    @PostMapping("/kyc/verify")
    public ResponseEntity<ApiResponse<KycDocumentResponse>> verifyKyc(
            @Valid @RequestBody KycVerificationRequest request, Authentication auth) {
        try {
            KycDocumentResponse doc = employeeService.verifyKycDocument(request, auth.getName());
            return ResponseEntity.ok(ApiResponse.success(doc, "KYC document " + request.getAction() + "d successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "KYC_FAILED"));
        }
    }

    // === LOAN APPROVALS ===
    @GetMapping("/loans/pending")
    public ResponseEntity<ApiResponse<Page<LoanResponse>>> getPendingLoans(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<LoanResponse> loans = employeeService.getPendingLoans(
            PageRequest.of(page, size, Sort.by("createdAt").ascending()));
        return ResponseEntity.ok(ApiResponse.success(loans, "Pending loans retrieved"));
    }

    @PostMapping("/loans/{loanId}/review")
    public ResponseEntity<ApiResponse<LoanResponse>> reviewLoan(
            @PathVariable Long loanId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String action = body.get("action");
        String rejectionReason = body.get("rejectionReason");
        try {
            LoanResponse loan = employeeService.reviewLoan(loanId, action, rejectionReason, auth.getName());
            return ResponseEntity.ok(ApiResponse.success(loan, "Loan " + action + "d successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "LOAN_REVIEW_FAILED"));
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEmployeeDashboard() {
        Map<String, Object> data = Map.of(
            "message", "Employee dashboard loaded",
            "status", "operational"
        );
        return ResponseEntity.ok(ApiResponse.success(data, "Dashboard loaded"));
    }

    // === DEPOSIT ===
    @PostMapping("/customers/deposit")
    public ResponseEntity<ApiResponse<TransactionResponse>> depositToAccount(
            @Valid @RequestBody DepositRequest request, Authentication auth) {
        try {
            TransactionResponse txn = employeeService.depositToCustomerAccount(request, auth.getName());
            return ResponseEntity.ok(ApiResponse.success(txn, "Deposit of ₹" + request.getAmount() + " successful"));
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "DEPOSIT_FAILED"));
        }
    }

}