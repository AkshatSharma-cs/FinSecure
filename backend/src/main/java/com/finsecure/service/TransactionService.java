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

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final OtpRepository otpRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    private static final BigDecimal OTP_THRESHOLD = BigDecimal.valueOf(10000);

    @Transactional
    public TransactionResponse processTransfer(TransactionRequest request, String userEmail) {
        Account fromAccount = accountRepository.findByAccountNumber(request.getFromAccountNumber())
            .orElseThrow(() -> new IllegalArgumentException("Source account not found"));

        if (!fromAccount.getCustomer().getUser().getEmail().equals(userEmail)) {
            throw new SecurityException("Unauthorized: Account does not belong to this user");
        }

        if (fromAccount.getStatus() != Account.AccountStatus.ACTIVE) {
            throw new IllegalStateException("Source account is not active");
        }

        if (fromAccount.getBalance().compareTo(request.getAmount()) < 0) {
            throw new IllegalStateException("Insufficient balance");
        }

        // OTP verification for large amounts
        if (request.getAmount().compareTo(OTP_THRESHOLD) > 0) {
            validateOtp(fromAccount.getCustomer().getUser().getEmail(), request.getOtpCode());
        }

        // Debit from source
        fromAccount.setBalance(fromAccount.getBalance().subtract(request.getAmount()));
        accountRepository.save(fromAccount);

        Transaction debitTxn = Transaction.builder()
            .referenceNumber(generateReferenceNumber())
            .account(fromAccount)
            .type(TransactionType.DEBIT)
            .mode(request.getMode())
            .amount(request.getAmount())
            .balanceAfter(fromAccount.getBalance())
            .description(request.getDescription())
            .targetAccountNumber(request.getToAccountNumber())
            .status(Transaction.TransactionStatus.SUCCESS)
            .build();

        transactionRepository.save(debitTxn);

        // Credit to destination if internal transfer
        if (request.getToAccountNumber() != null && !request.getToAccountNumber().isEmpty()) {
            accountRepository.findByAccountNumber(request.getToAccountNumber()).ifPresent(toAccount -> {
                if (toAccount.getStatus() == Account.AccountStatus.ACTIVE) {
                    toAccount.setBalance(toAccount.getBalance().add(request.getAmount()));
                    accountRepository.save(toAccount);

                    Transaction creditTxn = Transaction.builder()
                        .referenceNumber(generateReferenceNumber())
                        .account(toAccount)
                        .type(TransactionType.CREDIT)
                        .mode(request.getMode())
                        .amount(request.getAmount())
                        .balanceAfter(toAccount.getBalance())
                        .description("Transfer from " + request.getFromAccountNumber())
                        .targetAccountNumber(request.getFromAccountNumber())
                        .status(Transaction.TransactionStatus.SUCCESS)
                        .build();

                    transactionRepository.save(creditTxn);

                    Long recipientUserId = toAccount.getCustomer().getUser().getId();
                    notificationService.sendTransactionNotification(recipientUserId,
                        toAccount.getAccountNumber(), request.getAmount().toString(), "credit");
                }
            });
        }

        Long senderUserId = fromAccount.getCustomer().getUser().getId();
        notificationService.sendTransactionNotification(senderUserId,
            fromAccount.getAccountNumber(), request.getAmount().toString(), "debit");

        emailService.sendTransactionAlert(
            fromAccount.getCustomer().getUser().getEmail(),
            fromAccount.getAccountNumber(),
            request.getAmount().toString(),
            "debit",
            fromAccount.getBalance().toString()
        );

        return mapToResponse(debitTxn);
    }

    @Transactional
    public TransactionResponse processDeposit(String accountNumber, BigDecimal amount, String description) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        account.setBalance(account.getBalance().add(amount));
        accountRepository.save(account);

        Transaction txn = Transaction.builder()
            .referenceNumber(generateReferenceNumber())
            .account(account)
            .type(TransactionType.CREDIT)
            .mode(Transaction.TransactionMode.CASH)
            .amount(amount)
            .balanceAfter(account.getBalance())
            .description(description != null ? description : "Cash deposit")
            .status(Transaction.TransactionStatus.SUCCESS)
            .build();

        return mapToResponse(transactionRepository.save(txn));
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactionHistory(Long accountId, Pageable pageable) {
        return transactionRepository.findByAccountId(accountId, pageable).map(this::mapToResponse);
    }

    private void validateOtp(String email, String otpCode) {
        if (otpCode == null || otpCode.isBlank()) {
            throw new IllegalArgumentException("OTP is required for transactions above Rs.10,000");
        }

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
        return "TXN" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
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

    @Transactional
    public TransactionResponse processSelfDeposit(String accountNumber, java.math.BigDecimal amount,
                                                   String description, String userEmail) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));

        if (!account.getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Account does not belong to you");

        if (account.getStatus() != Account.AccountStatus.ACTIVE)
            throw new IllegalStateException("Account is not active");

        return processDeposit(accountNumber, amount, description != null ? description : "Self deposit");
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getFilteredTransactions(
            Long accountId, String userEmail, int page, int size,
            String type, String fromDate, String toDate,
            String minAmount, String maxAmount) {

        // Validate account belongs to user
        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!account.getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Account does not belong to you");

        TransactionType txnType = (type != null && !type.isBlank()) ? TransactionType.valueOf(type) : null;
        LocalDateTime from = (fromDate != null && !fromDate.isBlank())
            ? LocalDateTime.parse(fromDate + "T00:00:00") : null;
        LocalDateTime to = (toDate != null && !toDate.isBlank())
            ? LocalDateTime.parse(toDate + "T23:59:59") : null;
        BigDecimal min = (minAmount != null && !minAmount.isBlank()) ? new BigDecimal(minAmount) : null;
        BigDecimal max = (maxAmount != null && !maxAmount.isBlank()) ? new BigDecimal(maxAmount) : null;

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return transactionRepository.findFiltered(accountId, txnType, from, to, min, max, pageable)
            .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public byte[] generateAccountStatement(Long accountId, String userEmail, int months) throws Exception {
        Account account = accountRepository.findById(accountId)
            .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!account.getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Account does not belong to you");

        LocalDateTime from = LocalDateTime.now().minusMonths(months);
        LocalDateTime to = LocalDateTime.now();
        List<Transaction> txns = transactionRepository.findByAccountIdAndCreatedAtBetween(accountId, from, to);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
        DateTimeFormatter df  = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        String customerName = account.getCustomer().getFirstName() + " " + account.getCustomer().getLastName();

        // Build a simple text-based PDF using raw PDF commands
        StringBuilder sb = new StringBuilder();
        sb.append("%PDF-1.4\n");

        // Build readable content as a plain text stream
        StringBuilder content = new StringBuilder();
        content.append("FINSECURE BANK\n");
        content.append("Account Statement\n");
        content.append("=".repeat(60)).append("\n\n");
        content.append(String.format("Account Holder : %s\n", customerName));
        content.append(String.format("Account Number : %s\n", account.getAccountNumber()));
        content.append(String.format("Account Type   : %s\n", account.getAccountType()));
        content.append(String.format("IFSC Code      : %s\n", account.getIfscCode()));
        content.append(String.format("Branch         : %s\n", account.getBranchName()));
        content.append(String.format("Statement From : %s\n", from.format(df)));
        content.append(String.format("Statement To   : %s\n", to.format(df)));
        content.append(String.format("Current Balance: INR %,.2f\n\n", account.getBalance()));
        content.append("=".repeat(60)).append("\n");
        content.append(String.format("%-28s %-10s %-8s %-12s %-14s\n",
            "Date", "Type", "Mode", "Amount", "Balance"));
        content.append("-".repeat(60)).append("\n");

        BigDecimal totalCredits = BigDecimal.ZERO;
        BigDecimal totalDebits  = BigDecimal.ZERO;

        for (Transaction t : txns) {
            String sign = t.getType() == TransactionType.CREDIT ? "+" : "-";
            content.append(String.format("%-28s %-10s %-8s %s%-11s %-14s\n",
                t.getCreatedAt().format(dtf),
                t.getType(),
                t.getMode(),
                sign,
                String.format("%,.2f", t.getAmount()),
                String.format("%,.2f", t.getBalanceAfter())));
            if (t.getDescription() != null && !t.getDescription().isBlank()) {
                content.append(String.format("  Desc: %s\n", t.getDescription()));
            }
            if (t.getType() == TransactionType.CREDIT) totalCredits = totalCredits.add(t.getAmount());
            else totalDebits = totalDebits.add(t.getAmount());
        }

        content.append("=".repeat(60)).append("\n");
        content.append(String.format("Total Credits  : INR %,.2f\n", totalCredits));
        content.append(String.format("Total Debits   : INR %,.2f\n", totalDebits));
        content.append(String.format("Total Txns     : %d\n", txns.size()));
        content.append("\nGenerated on: ").append(to.format(dtf)).append("\n");
        content.append("This is a computer-generated statement. No signature required.\n");

        // Build minimal valid PDF
        byte[] streamData = content.toString().getBytes();
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        String obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        String obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        String streamContent = "BT\n/F1 9 Tf\n50 780 Td\n14 TL\n";
        for (String line : content.toString().split("\n")) {
            String escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
            streamContent += "(" + escaped + ") Tj T*\n";
        }
        streamContent += "ET\n";
        byte[] streamBytes = streamContent.getBytes();

        String obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n"
            + "   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n";
        String obj4 = "4 0 obj\n<< /Length " + streamBytes.length + " >>\nstream\n";
        String obj4end = "\nendstream\nendobj\n";
        String obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n";

        String header = "%PDF-1.4\n";
        out.write(header.getBytes());
        int[] offsets = new int[6];
        offsets[1] = out.size(); out.write(obj1.getBytes());
        offsets[2] = out.size(); out.write(obj2.getBytes());
        offsets[3] = out.size(); out.write(obj3.getBytes());
        offsets[4] = out.size();
        out.write(obj4.getBytes());
        out.write(streamBytes);
        out.write(obj4end.getBytes());
        offsets[5] = out.size(); out.write(obj5.getBytes());

        int xrefOffset = out.size();
        String xref = "xref\n0 6\n0000000000 65535 f \n"
            + String.format("%010d 00000 n \n", offsets[1])
            + String.format("%010d 00000 n \n", offsets[2])
            + String.format("%010d 00000 n \n", offsets[3])
            + String.format("%010d 00000 n \n", offsets[4])
            + String.format("%010d 00000 n \n", offsets[5]);
        out.write(xref.getBytes());
        String trailer = "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n";
        out.write(trailer.getBytes());

        return out.toByteArray();
    }

}