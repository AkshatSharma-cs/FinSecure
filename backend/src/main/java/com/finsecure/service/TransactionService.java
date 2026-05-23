package com.finsecure.service;

import com.finsecure.dto.TransactionRequest;
import com.finsecure.dto.TransactionResponse;
import com.finsecure.entity.*;
import com.finsecure.entity.Otp.OtpPurpose;
import com.finsecure.entity.Transaction.TransactionType;
import com.finsecure.repository.AccountRepository;
import com.finsecure.repository.OtpRepository;
import com.finsecure.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

/**
 * Service for account transfers, deposits, and transaction history.
 *
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository     accountRepository;
    private final OtpRepository         otpRepository;
    private final NotificationService   notificationService;
    private final EmailService          emailService;

    private static final BigDecimal OTP_THRESHOLD = BigDecimal.valueOf(10_000);

    // ── Transfer ──────────────────────────────────────────────────────────────

    @Transactional
    public TransactionResponse processTransfer(TransactionRequest request, String userEmail) {
        return processTransfer(request, userEmail, null);
    }

    @Transactional
    public TransactionResponse processTransfer(TransactionRequest request,
                                               String userEmail,
                                               String idempotencyKey) {
        Account fromAccount = accountRepository.findByAccountNumber(request.getFromAccountNumber())
                .orElseThrow(() -> new IllegalArgumentException("Source account not found"));

        if (!fromAccount.getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Unauthorized: account does not belong to this user");
        if (fromAccount.getStatus() != Account.AccountStatus.ACTIVE)
            throw new IllegalStateException("Source account is not active");
        if (fromAccount.getBalance().compareTo(request.getAmount()) < 0)
            throw new IllegalStateException("Insufficient balance");

        // OTP for large transfers
        if (request.getAmount().compareTo(OTP_THRESHOLD) > 0)
            validateOtp(fromAccount.getCustomer().getUser().getEmail(), request.getOtpCode());

        // ── Debit source ──────────────────────────────────────────────────────
        fromAccount.setBalance(fromAccount.getBalance().subtract(request.getAmount()));
        accountRepository.save(fromAccount);

        String refNumber = generateReferenceNumber();

        Transaction debitTxn = transactionRepository.save(Transaction.builder()
                .referenceNumber(refNumber)
                .account(fromAccount)
                .type(TransactionType.DEBIT)
                .mode(request.getMode())
                .amount(request.getAmount())
                .balanceAfter(fromAccount.getBalance())
                .description(request.getDescription())
                .targetAccountNumber(request.getToAccountNumber())
                .status(Transaction.TransactionStatus.SUCCESS)
                .build());

        // ── Credit destination ────────────────────────────────────────────────
        boolean creditSucceeded = false;
        Account toAccount = null;

        if (request.getToAccountNumber() != null && !request.getToAccountNumber().isBlank()) {
            toAccount = accountRepository
                    .findByAccountNumber(request.getToAccountNumber()).orElse(null);

            if (toAccount != null && toAccount.getStatus() == Account.AccountStatus.ACTIVE) {
                toAccount.setBalance(toAccount.getBalance().add(request.getAmount()));
                accountRepository.save(toAccount);

                transactionRepository.save(Transaction.builder()
                        .referenceNumber(generateReferenceNumber())
                        .account(toAccount)
                        .type(TransactionType.CREDIT)
                        .mode(request.getMode())
                        .amount(request.getAmount())
                        .balanceAfter(toAccount.getBalance())
                        .description("Transfer from " + request.getFromAccountNumber())
                        .targetAccountNumber(request.getFromAccountNumber())
                        .status(Transaction.TransactionStatus.SUCCESS)
                        .build());

                notificationService.sendTransactionNotification(
                        toAccount.getCustomer().getUser().getId(),
                        toAccount.getAccountNumber(),
                        request.getAmount().toString(), "credit");

                creditSucceeded = true;
            }
        }

        // ── Double-entry ledger post ───────────────────────────────────────────
        if (creditSucceeded && toAccount != null) {
            // Normal bilateral transfer
            log.info("Completed internal transfer {}", refNumber);
        } else if (!creditSucceeded && request.getToAccountNumber() != null) {
            // Destination not found or inactive → REVERSE the debit immediately
            log.warn("Destination account {} not found or inactive — reversing debit {}",
                    request.getToAccountNumber(), refNumber);

            fromAccount.setBalance(fromAccount.getBalance().add(request.getAmount()));
            accountRepository.save(fromAccount);

            debitTxn.setStatus(Transaction.TransactionStatus.REVERSED);
            transactionRepository.save(debitTxn);

            // Ledger reversal
            throw new IllegalStateException(
                "Destination account not found or inactive. Transfer has been reversed.");
        } else {
            // External transfer (no internal destination account): debit only
            log.info("Completed external transfer debit {}", refNumber);
        }

        // Notifications
        notificationService.sendTransactionNotification(
                fromAccount.getCustomer().getUser().getId(),
                fromAccount.getAccountNumber(),
                request.getAmount().toString(), "debit");

        emailService.sendTransactionAlert(
                fromAccount.getCustomer().getUser().getEmail(),
                fromAccount.getAccountNumber(),
                request.getAmount().toString(), "debit",
                fromAccount.getBalance().toString());

        return mapToResponse(debitTxn);
    }

    // ── Deposit ───────────────────────────────────────────────────────────────

    @Transactional
    public TransactionResponse processDeposit(String accountNumber, BigDecimal amount, String description) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        account.setBalance(account.getBalance().add(amount));
        accountRepository.save(account);

        String refNumber = generateReferenceNumber();

        Transaction txn = transactionRepository.save(Transaction.builder()
                .referenceNumber(refNumber)
                .account(account)
                .type(TransactionType.CREDIT)
                .mode(Transaction.TransactionMode.CASH)
                .amount(amount)
                .balanceAfter(account.getBalance())
                .description(description != null ? description : "Cash deposit")
                .status(Transaction.TransactionStatus.SUCCESS)
                .build());

        return mapToResponse(txn);
    }

    @Transactional
    public TransactionResponse processSelfDeposit(String accountNumber, BigDecimal amount,
                                                   String description, String userEmail) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (!account.getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Account does not belong to you");
        if (account.getStatus() != Account.AccountStatus.ACTIVE)
            throw new IllegalStateException("Account is not active");

        return processDeposit(accountNumber, amount, description != null ? description : "Self deposit");
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactionHistory(Long accountId, Pageable pageable) {
        return transactionRepository.findByAccountId(accountId, pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getFilteredTransactions(
            Long accountId, String userEmail, int page, int size,
            String type, String fromDate, String toDate,
            String minAmount, String maxAmount) {

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!account.getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Account does not belong to you");

        TransactionType txnType = (type != null && !type.isBlank())
                ? TransactionType.valueOf(type) : null;
        LocalDateTime from = (fromDate != null && !fromDate.isBlank())
                ? LocalDateTime.parse(fromDate + "T00:00:00") : null;
        LocalDateTime to   = (toDate   != null && !toDate.isBlank())
                ? LocalDateTime.parse(toDate   + "T23:59:59") : null;
        BigDecimal min = (minAmount != null && !minAmount.isBlank())
                ? new BigDecimal(minAmount) : null;
        BigDecimal max = (maxAmount != null && !maxAmount.isBlank())
                ? new BigDecimal(maxAmount) : null;

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return transactionRepository
                .findFiltered(accountId, txnType, from, to, min, max, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public byte[] generateAccountStatement(Long accountId, String userEmail, int months) throws Exception {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!account.getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Account does not belong to you");

        LocalDateTime from = LocalDateTime.now().minusMonths(months);
        LocalDateTime to   = LocalDateTime.now();
        List<Transaction> txns = transactionRepository.findByAccountIdAndCreatedAtBetween(accountId, from, to);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
        DateTimeFormatter df  = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        String customerName   = account.getCustomer().getFirstName() + " " + account.getCustomer().getLastName();

        StringBuilder content = new StringBuilder();
        content.append("FINSECURE BANK\nAccount Statement\n")
               .append("=".repeat(60)).append("\n\n")
               .append(String.format("Account Holder : %s\n", customerName))
               .append(String.format("Account Number : %s\n", account.getAccountNumber()))
               .append(String.format("Account Type   : %s\n", account.getAccountType()))
               .append(String.format("IFSC Code      : %s\n", account.getIfscCode()))
               .append(String.format("Branch         : %s\n", account.getBranchName()))
               .append(String.format("Statement From : %s\n", from.format(df)))
               .append(String.format("Statement To   : %s\n", to.format(df)))
               .append(String.format("Current Balance: INR %,.2f\n\n", account.getBalance()))
               .append("=".repeat(60)).append("\n")
               .append(String.format("%-28s %-10s %-8s %-12s %-14s\n",
                       "Date", "Type", "Mode", "Amount", "Balance"))
               .append("-".repeat(60)).append("\n");

        BigDecimal totalCredits = BigDecimal.ZERO;
        BigDecimal totalDebits  = BigDecimal.ZERO;

        for (Transaction t : txns) {
            String sign = t.getType() == TransactionType.CREDIT ? "+" : "-";
            content.append(String.format("%-28s %-10s %-8s %s%-11s %-14s\n",
                    t.getCreatedAt().format(dtf), t.getType(), t.getMode(),
                    sign, String.format("%,.2f", t.getAmount()),
                    String.format("%,.2f", t.getBalanceAfter())));
            if (t.getDescription() != null && !t.getDescription().isBlank())
                content.append(String.format("  Desc: %s\n", t.getDescription()));
            if (t.getType() == TransactionType.CREDIT) totalCredits = totalCredits.add(t.getAmount());
            else                                        totalDebits  = totalDebits.add(t.getAmount());
        }

        content.append("=".repeat(60)).append("\n")
               .append(String.format("Total Credits  : INR %,.2f\n", totalCredits))
               .append(String.format("Total Debits   : INR %,.2f\n", totalDebits))
               .append(String.format("Total Txns     : %d\n", txns.size()))
               .append("\nGenerated on: ").append(to.format(dtf)).append("\n")
               .append("This is a computer-generated statement. No signature required.\n");

        // Minimal valid PDF (same structure as original)
        byte[] streamBytes = buildPdfStream(content.toString());
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        String header = "%PDF-1.4\n";
        String obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        String obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        String obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n" +
                      "   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n";
        String obj4 = "4 0 obj\n<< /Length " + streamBytes.length + " >>\nstream\n";
        String obj4end = "\nendstream\nendobj\n";
        String obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n";

        out.write(header.getBytes());
        int[] offsets = new int[6];
        offsets[1] = out.size(); out.write(obj1.getBytes());
        offsets[2] = out.size(); out.write(obj2.getBytes());
        offsets[3] = out.size(); out.write(obj3.getBytes());
        offsets[4] = out.size();
        out.write(obj4.getBytes()); out.write(streamBytes); out.write(obj4end.getBytes());
        offsets[5] = out.size(); out.write(obj5.getBytes());

        int xrefOffset = out.size();
        String xref = "xref\n0 6\n0000000000 65535 f \n"
                + String.format("%010d 00000 n \n", offsets[1])
                + String.format("%010d 00000 n \n", offsets[2])
                + String.format("%010d 00000 n \n", offsets[3])
                + String.format("%010d 00000 n \n", offsets[4])
                + String.format("%010d 00000 n \n", offsets[5]);
        out.write(xref.getBytes());
        out.write(("trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n").getBytes());

        return out.toByteArray();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void validateOtp(String email, String otpCode) {
        if (otpCode == null || otpCode.isBlank())
            throw new IllegalArgumentException("OTP required for transactions above ₹10,000");

        Otp otp = otpRepository.findValidOtp(email, OtpPurpose.TRANSACTION, LocalDateTime.now())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired OTP"));

        if (!otp.getOtpCode().equals(otpCode)) {
            otp.setAttemptCount(otp.getAttemptCount() + 1);
            otpRepository.save(otp);
            throw new IllegalArgumentException("Incorrect OTP");
        }
        otp.setUsed(true);
        otpRepository.save(otp);
    }

    private String generateReferenceNumber() {
        return "TXN" + System.currentTimeMillis() +
               UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private byte[] buildPdfStream(String text) {
        StringBuilder sb = new StringBuilder("BT\n/F1 9 Tf\n50 780 Td\n14 TL\n");
        for (String line : text.split("\n")) {
            String escaped = line.replace("\\", "\\\\")
                                 .replace("(", "\\(")
                                 .replace(")", "\\)");
            sb.append("(").append(escaped).append(") Tj T*\n");
        }
        sb.append("ET\n");
        return sb.toString().getBytes();
    }

    private TransactionResponse mapToResponse(Transaction txn) {
        return TransactionResponse.builder()
                .id(txn.getId())
                .referenceNumber(txn.getReferenceNumber())
                .accountNumber(txn.getAccount().getAccountNumber())
                .type(txn.getType())
                .mode(txn.getMode())
                .amount(txn.getAmount())
                .balanceAfter(txn.getBalanceAfter())
                .description(txn.getDescription())
                .targetAccountNumber(txn.getTargetAccountNumber())
                .status(txn.getStatus())
                .createdAt(txn.getCreatedAt())
                .build();
    }
}
