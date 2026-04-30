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

import java.util.List;
import java.util.Map;
import com.finsecure.dto.DepositRequest;
import com.finsecure.dto.TransactionResponse;

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
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String dir) {

        Sort.Direction direction = dir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        String sortField = sort.equals("firstName") ? "firstName" : sort.equals("kycStatus") ? "kycStatus" : "createdAt";
        PageRequest pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        Page<CustomerProfileResponse> customers = search != null && !search.isBlank()
            ? employeeService.searchCustomers(search, pageable)
            : employeeService.getAllCustomers(pageable);

        return ResponseEntity.ok(ApiResponse.success(customers, "Customers retrieved"));
    }

    @GetMapping("/customers/by-account")
    public ResponseEntity<ApiResponse<List<CustomerProfileResponse>>> getCustomerByAccount(
            @RequestParam String accountNumber) {
        List<CustomerProfileResponse> result = employeeService.searchByAccountNumber(accountNumber);
        return ResponseEntity.ok(ApiResponse.success(result, "Customer retrieved"));
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

    // === ADMIN ONLY: EMPLOYEE MANAGEMENT ===
    @GetMapping("/list")
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> getAllEmployees(Authentication auth) {
        if (!auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied", "FORBIDDEN"));
        }
        return ResponseEntity.ok(ApiResponse.success(employeeService.getAllEmployees(), "Employees retrieved"));
    }

    @PostMapping("/create")
    public ResponseEntity<ApiResponse<EmployeeResponse>> createEmployee(
            @Valid @RequestBody CreateEmployeeRequest request, Authentication auth) {
        if (!auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied", "FORBIDDEN"));
        }
        try {
            EmployeeResponse emp = employeeService.createEmployee(request);
            return ResponseEntity.ok(ApiResponse.success(emp, "Employee created successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "CREATE_FAILED"));
        }
    }

    @DeleteMapping("/{employeeId}")
    public ResponseEntity<ApiResponse<String>> deleteEmployee(@PathVariable Long employeeId, Authentication auth) {
        if (!auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return ResponseEntity.status(403).body(ApiResponse.error("Access denied", "FORBIDDEN"));
        }
        try {
            employeeService.deleteEmployee(employeeId);
            return ResponseEntity.ok(ApiResponse.success("Employee deleted", "Deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage(), "DELETE_FAILED"));
        }
    }

}