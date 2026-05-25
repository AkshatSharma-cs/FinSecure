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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
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
        if (months <= 0)
            throw new IllegalArgumentException("Statement duration must be at least 1 month");

        Account account = getOwnedAccount(accountId, userEmail);
        LocalDateTime from = LocalDateTime.now().minusMonths(months);
        LocalDateTime to   = LocalDateTime.now();
        return generateAccountStatementPdf(account, accountId, from, to, "Last " + months + " month(s)");
    }

    @Transactional(readOnly = true)
    public byte[] generatePeriodicAccountStatement(Long accountId, String userEmail,
                                                   String period, Integer year,
                                                   Integer month, Integer quarter) throws Exception {
        Account account = getOwnedAccount(accountId, userEmail);
        StatementWindow window = resolveStatementWindow(period, year, month, quarter);
        return generateAccountStatementPdf(account, accountId, window.from(), window.to(), window.label());
    }

    private Account getOwnedAccount(Long accountId, String userEmail) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!account.getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Account does not belong to you");
        return account;
    }

    private StatementWindow resolveStatementWindow(String period, Integer year,
                                                   Integer month, Integer quarter) {
        String normalizedPeriod = period == null || period.isBlank()
                ? (quarter != null ? "QUARTERLY" : "MONTHLY")
                : period.trim().toUpperCase();
        LocalDate now = LocalDate.now();
        int statementYear = year != null ? year : now.getYear();

        return switch (normalizedPeriod) {
            case "MONTHLY" -> {
                int statementMonth = month != null ? month : now.getMonthValue();
                if (statementMonth < 1 || statementMonth > 12)
                    throw new IllegalArgumentException("Month must be between 1 and 12");
                YearMonth yearMonth = YearMonth.of(statementYear, statementMonth);
                yield new StatementWindow(
                        yearMonth.atDay(1).atStartOfDay(),
                        yearMonth.atEndOfMonth().atTime(23, 59, 59),
                        "Monthly Statement - " + yearMonth.format(DateTimeFormatter.ofPattern("MMMM yyyy")));
            }
            case "QUARTERLY" -> {
                int statementQuarter = quarter != null ? quarter : ((now.getMonthValue() - 1) / 3) + 1;
                if (statementQuarter < 1 || statementQuarter > 4)
                    throw new IllegalArgumentException("Quarter must be between 1 and 4");
                int startMonth = ((statementQuarter - 1) * 3) + 1;
                YearMonth endMonth = YearMonth.of(statementYear, startMonth + 2);
                yield new StatementWindow(
                        LocalDate.of(statementYear, startMonth, 1).atStartOfDay(),
                        endMonth.atEndOfMonth().atTime(23, 59, 59),
                        "Quarterly Statement - Q" + statementQuarter + " " + statementYear);
            }
            default -> throw new IllegalArgumentException("Period must be MONTHLY or QUARTERLY");
        };
    }

    private byte[] generateAccountStatementPdf(Account account, Long accountId,
                                               LocalDateTime from, LocalDateTime to,
                                               String statementLabel) throws Exception {
        List<Transaction> txns = transactionRepository.findByAccountIdAndCreatedAtBetween(accountId, from, to);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm");
        DateTimeFormatter df  = DateTimeFormatter.ofPattern("dd-MM-yyyy");
        String customerName   = account.getCustomer().getFirstName() + " " + account.getCustomer().getLastName();

        BigDecimal totalCredits = BigDecimal.ZERO;
        BigDecimal totalDebits  = BigDecimal.ZERO;
        BigDecimal previousBalance = account.getBalance();

        for (Transaction t : txns) {
            if (t.getType() == TransactionType.CREDIT) totalCredits = totalCredits.add(t.getAmount());
            else                                        totalDebits  = totalDebits.add(t.getAmount());
        }
        if (!txns.isEmpty()) {
            Transaction first = txns.get(0);
            previousBalance = first.getType() == TransactionType.CREDIT
                    ? first.getBalanceAfter().subtract(first.getAmount())
                    : first.getBalanceAfter().add(first.getAmount());
        }

        byte[] streamBytes = buildStatementPdfStream(account, customerName, statementLabel,
                from.format(df), to.format(df), LocalDateTime.now().format(dtf), txns,
                previousBalance, totalCredits, totalDebits);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        String header = "%PDF-1.4\n";
        String obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        String obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        String obj3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842]\n" +
                      "   /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n";
        String obj4 = "4 0 obj\n<< /Length " + streamBytes.length + " >>\nstream\n";
        String obj4end = "\nendstream\nendobj\n";
        String obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n";
        String obj6 = "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";

        out.write(header.getBytes());
        int[] offsets = new int[7];
        offsets[1] = out.size(); out.write(obj1.getBytes());
        offsets[2] = out.size(); out.write(obj2.getBytes());
        offsets[3] = out.size(); out.write(obj3.getBytes());
        offsets[4] = out.size();
        out.write(obj4.getBytes()); out.write(streamBytes); out.write(obj4end.getBytes());
        offsets[5] = out.size(); out.write(obj5.getBytes());
        offsets[6] = out.size(); out.write(obj6.getBytes());

        int xrefOffset = out.size();
        String xref = "xref\n0 7\n0000000000 65535 f \n"
                + String.format("%010d 00000 n \n", offsets[1])
                + String.format("%010d 00000 n \n", offsets[2])
                + String.format("%010d 00000 n \n", offsets[3])
                + String.format("%010d 00000 n \n", offsets[4])
                + String.format("%010d 00000 n \n", offsets[5])
                + String.format("%010d 00000 n \n", offsets[6]);
        out.write(xref.getBytes());
        out.write(("trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n" + xrefOffset + "\n%%EOF\n").getBytes());

        return out.toByteArray();
    }

    private record StatementWindow(LocalDateTime from, LocalDateTime to, String label) {}

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

    private byte[] buildStatementPdfStream(Account account, String customerName, String statementLabel,
                                           String fromDate, String toDate, String generatedOn,
                                           List<Transaction> txns, BigDecimal previousBalance,
                                           BigDecimal totalCredits, BigDecimal totalDebits) {
        StringBuilder sb = new StringBuilder();
        String blue = "0 0.29 0.43 rg\n";
        String lightGray = "0.92 0.92 0.92 rg\n";
        String border = "0.75 0.75 0.75 RG\n";

        // Header and logo placeholder.
        drawText(sb, "FinSecure Bank", 32, 812, 24, true);
        drawText(sb, "Secure digital banking", 34, 794, 10, false);
        sb.append("0.9 0.9 0.9 rg\n10 724 214 55 re f\n");
        sb.append(border).append("10 724 214 55 re S\n");
        drawText(sb, "FinSecure", 80, 753, 16, false);
        drawText(sb, "Statement", 466, 812, 24, true);

        drawText(sb, "Date:", 374, 770, 9, false);
        drawText(sb, generatedOn, 458, 770, 8, false);
        drawText(sb, "Statement #:", 374, 752, 9, false);
        drawText(sb, "ST-" + account.getAccountNumber(), 458, 752, 8, false);
        drawText(sb, "Customer ID:", 374, 734, 9, false);
        drawText(sb, String.valueOf(account.getCustomer().getId()), 458, 734, 8, false);
        drawText(sb, "Page", 374, 716, 9, false);
        drawText(sb, "1 of 1", 458, 716, 8, false);
        sb.append(border).append("454 706 138 72 re S\n");

        // Bill-to block.
        drawFilledRect(sb, 10, 675, 202, 18, blue);
        drawTextWhite(sb, "Bill To:", 18, 681, 10, true);
        drawText(sb, customerName, 18, 661, 8, false);
        drawText(sb, account.getAccountNumber(), 18, 648, 8, false);
        drawText(sb, account.getAccountType().name().replace('_', ' ') + " Account", 18, 635, 8, false);
        drawText(sb, account.getBranchName(), 18, 622, 8, false);
        drawText(sb, account.getIfscCode(), 18, 609, 8, false);

        // Account summary.
        drawFilledRect(sb, 363, 675, 230, 18, blue);
        drawTextWhite(sb, "Account Summary", 371, 681, 10, true);
        drawSummaryLine(sb, "Previous Balance", previousBalance, 371, 660);
        drawSummaryLine(sb, "Credits", totalCredits, 371, 647);
        drawSummaryLine(sb, "New Charges", totalDebits, 371, 634);
        drawSummaryLine(sb, "Total Balance Due", account.getBalance(), 371, 621);
        drawText(sb, "Statement Period", 371, 606, 8, true);
        drawText(sb, fromDate + " to " + toDate, 468, 606, 8, false);

        // Transaction table.
        int tableTop = 575;
        int rowHeight = 19;
        int[] xs = {6, 66, 126, 364, 440, 517, 593};
        drawFilledRect(sb, xs[0], tableTop, xs[6] - xs[0], rowHeight, blue);
        drawTextWhite(sb, "Date", 16, tableTop + 6, 8, true);
        drawTextWhite(sb, "Reference #", 73, tableTop + 6, 8, true);
        drawTextWhite(sb, "Description", 134, tableTop + 6, 8, true);
        drawTextWhite(sb, "Charges", 389, tableTop + 6, 8, true);
        drawTextWhite(sb, "Credits", 466, tableTop + 6, 8, true);
        drawTextWhite(sb, "Balance", 536, tableTop + 6, 8, true);

        int row = 0;
        for (Transaction t : txns) {
            if (row >= 18) break;
            int y = tableTop - ((row + 1) * rowHeight);
            if (row % 2 == 0) drawFilledRect(sb, xs[0], y, xs[6] - xs[0], rowHeight, lightGray);
            drawText(sb, t.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yy")), 16, y + 6, 7, false);
            drawText(sb, trim(t.getReferenceNumber(), 14), 73, y + 6, 7, false);
            drawText(sb, trim(t.getDescription() != null ? t.getDescription() : t.getMode().name(), 38), 134, y + 6, 7, false);
            if (t.getType() == TransactionType.DEBIT) {
                drawText(sb, money(t.getAmount()), 369, y + 6, 7, false);
            } else {
                drawText(sb, money(t.getAmount()), 445, y + 6, 7, false);
            }
            drawText(sb, money(t.getBalanceAfter()), 522, y + 6, 7, false);
            row++;
        }
        for (; row < 20; row++) {
            int y = tableTop - ((row + 1) * rowHeight);
            if (row % 2 == 0) drawFilledRect(sb, xs[0], y, xs[6] - xs[0], rowHeight, lightGray);
        }
        sb.append(border);
        for (int x : xs) sb.append(x).append(" 176 m ").append(x).append(" 594 l S\n");
        sb.append(xs[0]).append(" 176 ").append(xs[6] - xs[0]).append(" 418 re S\n");

        // Balance bar and footer.
        drawFilledRect(sb, 6, 148, 587, 19, blue);
        drawTextWhite(sb, "Account Current Balance", 388, 154, 9, true);
        drawTextWhite(sb, money(account.getBalance()), 537, 154, 9, true);
        drawText(sb, "Your account balance is " + money(account.getBalance()) + ".", 106, 128, 7, true);
        drawText(sb, "Thank you for banking with FinSecure!", 205, 82, 12, true);
        sb.append("0.75 0.75 0.75 RG\n7 52 586 0 re S\n");
        drawText(sb, "FinSecure Bank, Main Branch", 206, 39, 7, false);
        drawText(sb, "Tel: 1800-000-0000  Email: support@finsecure.com  Web: www.finsecure.com", 119, 25, 7, false);

        return sb.toString().getBytes();
    }

    private void drawSummaryLine(StringBuilder sb, String label, BigDecimal amount, int x, int y) {
        drawText(sb, label, x, y, 8, false);
        drawText(sb, "INR", x + 120, y, 8, false);
        drawText(sb, money(amount), x + 152, y, 8, false);
    }

    private void drawFilledRect(StringBuilder sb, int x, int y, int width, int height, String color) {
        sb.append(color).append(x).append(' ').append(y).append(' ')
                .append(width).append(' ').append(height).append(" re f\n");
    }

    private void drawText(StringBuilder sb, String text, int x, int y, int size, boolean bold) {
        sb.append("0 0 0 rg\nBT\n/")
                .append(bold ? "F2" : "F1")
                .append(' ').append(size).append(" Tf\n")
                .append(x).append(' ').append(y).append(" Td\n(")
                .append(pdfEscape(text)).append(") Tj\nET\n");
    }

    private void drawTextWhite(StringBuilder sb, String text, int x, int y, int size, boolean bold) {
        sb.append("1 1 1 rg\nBT\n/")
                .append(bold ? "F2" : "F1")
                .append(' ').append(size).append(" Tf\n")
                .append(x).append(' ').append(y).append(" Td\n(")
                .append(pdfEscape(text)).append(") Tj\nET\n");
    }

    private String pdfEscape(String text) {
        return (text == null ? "" : text)
                .replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)");
    }

    private String money(BigDecimal amount) {
        return String.format("%,.2f", amount != null ? amount : BigDecimal.ZERO);
    }

    private String trim(String value, int maxLength) {
        if (value == null) return "";
        return value.length() <= maxLength ? value : value.substring(0, maxLength - 3) + "...";
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
