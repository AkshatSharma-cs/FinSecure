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
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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

}