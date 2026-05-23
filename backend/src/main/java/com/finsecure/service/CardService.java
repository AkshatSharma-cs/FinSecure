package com.finsecure.service;

import com.finsecure.dto.*;
import com.finsecure.entity.*;
import com.finsecure.entity.Card.CardStatus;
import com.finsecure.entity.Card.CardType;
import com.finsecure.repository.AccountRepository;
import com.finsecure.repository.CardRepository;
import com.finsecure.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for issuing and managing customer cards.
 *
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CardService {

    private final CardRepository               cardRepository;
    private final AccountRepository            accountRepository;
    private final CustomerRepository           customerRepository;
    private final NotificationService          notificationService;

    private final BCryptPasswordEncoder cvvEncoder = new BCryptPasswordEncoder();

    // ── Credit Card Schemes ───────────────────────────────────────────────────

    private static final Map<String, BigDecimal> CREDIT_LIMITS = Map.of(
        "CLASSIC",   BigDecimal.valueOf(50_000),
        "GOLD",      BigDecimal.valueOf(100_000),
        "PLATINUM",  BigDecimal.valueOf(300_000),
        "SIGNATURE", BigDecimal.valueOf(1_000_000)
    );
    private static final Map<String, Integer> ANNUAL_FEES = Map.of(
        "CLASSIC", 0, "GOLD", 500, "PLATINUM", 1000, "SIGNATURE", 2500
    );
    private static final Map<String, String> PERKS = Map.of(
        "CLASSIC",   "1% cashback on all spends. Zero joining fee.",
        "GOLD",      "2% cashback + 2x rewards on dining & fuel. ₹500/year.",
        "PLATINUM",  "3x rewards + lounge access (4/year) + travel insurance. ₹1000/year.",
        "SIGNATURE", "5x rewards + unlimited lounge + concierge + golf. ₹2500/year."
    );

    // ── Issue cards ───────────────────────────────────────────────────────────

    @Transactional
    public CardResponse issueDebitCard(Long accountId, String userEmail) {
        Account account = getOwnedAccount(accountId, userEmail);

        if (account.getStatus() != Account.AccountStatus.ACTIVE)
            throw new IllegalStateException("Account must be active to issue a card");
        if (account.getCustomer().getKycStatus() != Customer.KycStatus.APPROVED)
            throw new IllegalStateException("KYC must be approved to issue a card");
        if (cardRepository.existsByAccountIdAndCardTypeAndVariant(accountId, CardType.DEBIT, "REGULAR"))
            throw new IllegalStateException("A debit card already exists for this account");

        Card card = cardRepository.save(buildCard(account, CardType.DEBIT, "STANDARD", "REGULAR",
                null, null, 0, "Contactless payments + UPI linked"));

        notificationService.createNotification(account.getCustomer().getUser().getId(),
                Notification.NotificationType.CARD, "Debit Card Issued",
                "Your debit card " + card.getMaskedCardNumber() + " has been issued.",
                card.getId().toString(), "CARD");

        return mapToResponse(card);
    }

    @Transactional
    public CardResponse issueVirtualDebitCard(Long accountId, String userEmail) {
        Account account = getOwnedAccount(accountId, userEmail);

        if (account.getCustomer().getKycStatus() != Customer.KycStatus.APPROVED)
            throw new IllegalStateException("KYC must be approved to issue a virtual card");
        if (cardRepository.existsByAccountIdAndCardTypeAndVariant(accountId, CardType.DEBIT, "VIRTUAL"))
            throw new IllegalStateException("A virtual debit card already exists for this account");

        Card card = buildCard(account, CardType.DEBIT, "STANDARD", "VIRTUAL",
                null, null, 0, "Online-only virtual card.");
        card.setContactlessEnabled(false);
        card = cardRepository.save(card);

        notificationService.createNotification(account.getCustomer().getUser().getId(),
                Notification.NotificationType.CARD, "Virtual Debit Card Issued",
                "Your virtual debit card " + card.getMaskedCardNumber() + " is ready.",
                card.getId().toString(), "CARD");

        return mapToResponse(card);
    }

    @Transactional
    public CardResponse issueCreditCard(IssueCreditCardRequest request, String userEmail) {
        Account account = getOwnedAccount(request.getAccountId(), userEmail);

        if (account.getCustomer().getKycStatus() != Customer.KycStatus.APPROVED)
            throw new IllegalStateException("KYC must be approved to issue a credit card");

        String scheme  = request.getScheme().toUpperCase();
        String variant = request.getVariant().toUpperCase();

        if (!CREDIT_LIMITS.containsKey(scheme))
            throw new IllegalArgumentException("Invalid scheme. Choose: CLASSIC, GOLD, PLATINUM, SIGNATURE");
        if (cardRepository.existsByAccountIdAndCardTypeAndScheme(account.getId(), CardType.CREDIT, scheme))
            throw new IllegalStateException("You already have a " + scheme + " credit card");

        BigDecimal limit    = CREDIT_LIMITS.get(scheme);
        int        annualFee = ANNUAL_FEES.get(scheme);
        String     perks    = PERKS.get(scheme);

        Card card = buildCard(account, CardType.CREDIT, scheme, variant,
                limit, limit, annualFee, perks);
        if ("VIRTUAL".equals(variant)) card.setContactlessEnabled(false);
        card = cardRepository.save(card);

        notificationService.createNotification(account.getCustomer().getUser().getId(),
                Notification.NotificationType.CARD, scheme + " Credit Card Issued",
                "Your " + scheme + " credit card with ₹" + limit + " limit is ready.",
                card.getId().toString(), "CARD");

        return mapToResponse(card);
    }

    @Transactional
    public CardResponse issuePrepaidCard(IssuePrepaidCardRequest request, String userEmail) {
        Account account = getOwnedAccount(request.getAccountId(), userEmail);

        if (account.getCustomer().getKycStatus() != Customer.KycStatus.APPROVED)
            throw new IllegalStateException("KYC must be approved to issue a prepaid card");
        if (account.getBalance().compareTo(request.getLoadAmount()) < 0)
            throw new IllegalStateException("Insufficient balance to load prepaid card");

        String variant = request.getVariant().toUpperCase();

        // Deduct from account
        account.setBalance(account.getBalance().subtract(request.getLoadAmount()));
        accountRepository.save(account);

        Card card = buildCard(account, CardType.PREPAID, "PREPAID", variant,
                null, null, 0, "Reloadable prepaid card. Use anywhere Visa is accepted.");
        card.setPrepaidBalance(request.getLoadAmount());
        if ("VIRTUAL".equals(variant)) card.setContactlessEnabled(false);
        card = cardRepository.save(card);

        notificationService.createNotification(account.getCustomer().getUser().getId(),
                Notification.NotificationType.CARD, "Prepaid Card Issued",
                "Your prepaid card loaded with ₹" + request.getLoadAmount() + " is ready.",
                card.getId().toString(), "CARD");

        return mapToResponse(card);
    }

    // ── NEW: Credit card spend / payment ─────────────────────────────────────

    /**
     * Validates and records a credit card spend.
     * Must be called from any controller or service that processes a CC purchase.
     *
     * @throws IllegalStateException if card is blocked, online/international disabled,
     *                               or available limit is insufficient
     */
    @Transactional
    public void recordCreditCardSpend(Long cardId, BigDecimal amount,
                                      String description, boolean isInternational) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));

        if (card.getCardType() != CardType.CREDIT)
            throw new IllegalArgumentException("Card is not a credit card");
        if (card.getStatus() == CardStatus.BLOCKED)
            throw new IllegalStateException("Card is blocked");
        if (!card.getOnlineEnabled())
            throw new IllegalStateException("Online transactions are disabled on this card");
        if (isInternational && !card.getInternationalEnabled())
            throw new IllegalStateException("International transactions are disabled on this card");

        if (amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Spend amount must be positive");
        if (card.getAvailableLimit().compareTo(amount) < 0)
            throw new IllegalStateException("Insufficient available credit limit");

        card.setAvailableLimit(card.getAvailableLimit().subtract(amount));
        cardRepository.save(card);

        log.info("Recorded CC spend ₹{} on card {}", amount, card.getMaskedCardNumber());
    }

    /**
     * Records a payment against an outstanding credit card balance.
     * Restores available limit and updates the billing cycle.
     */
    @Transactional
    public void recordCreditCardPayment(Long cardId, BigDecimal amount) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));

        if (card.getCardType() != CardType.CREDIT)
            throw new IllegalArgumentException("Card is not a credit card");
        if (amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Payment amount must be positive");

        BigDecimal creditLimit = card.getCreditLimit() != null ? card.getCreditLimit() : BigDecimal.ZERO;
        BigDecimal availableLimit = card.getAvailableLimit() != null ? card.getAvailableLimit() : BigDecimal.ZERO;
        card.setAvailableLimit(availableLimit.add(amount).min(creditLimit));
        cardRepository.save(card);

        log.info("Recorded CC payment ₹{} on card {}", amount, card.getMaskedCardNumber());
    }

    // ── Card actions ──────────────────────────────────────────────────────────

    @Transactional
    public CardResponse performCardAction(CardActionRequest request, String userEmail) {
        Card card = cardRepository.findById(request.getCardId())
                .orElseThrow(() -> new IllegalArgumentException("Card not found"));

        if (!card.getAccount().getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Unauthorized");

        switch (request.getAction().toUpperCase()) {
            case "BLOCK"                 -> card.setStatus(CardStatus.BLOCKED);
            case "UNBLOCK"               -> {
                if (card.getStatus() != CardStatus.BLOCKED)
                    throw new IllegalStateException("Card is not blocked");
                card.setStatus(CardStatus.ACTIVE);
            }
            case "ENABLE_INTERNATIONAL"  -> card.setInternationalEnabled(true);
            case "DISABLE_INTERNATIONAL" -> card.setInternationalEnabled(false);
            case "ENABLE_ONLINE"         -> card.setOnlineEnabled(true);
            case "DISABLE_ONLINE"        -> card.setOnlineEnabled(false);
            default -> throw new IllegalArgumentException("Unknown action: " + request.getAction());
        }

        card = cardRepository.save(card);

        notificationService.createNotification(
                card.getAccount().getCustomer().getUser().getId(),
                Notification.NotificationType.CARD, "Card Updated",
                "Action " + request.getAction() + " on " + card.getMaskedCardNumber(),
                card.getId().toString(), "CARD");

        return mapToResponse(card);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CardResponse> getCustomerCards(String userEmail) {
        Customer customer = customerRepository.findByUserEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
        return cardRepository.findByAccountCustomerId(customer.getId())
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Account getOwnedAccount(Long accountId, String userEmail) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found"));
        if (!account.getCustomer().getUser().getEmail().equals(userEmail))
            throw new SecurityException("Unauthorized");
        return account;
    }

    private Card buildCard(Account account, CardType type, String scheme, String variant,
                            BigDecimal creditLimit, BigDecimal availableLimit,
                            int annualFee, String perks) {
        String cardNumber = generateCardNumber();
        String cvv        = generateCvv();
        return Card.builder()
                .account(account)
                .cardType(type)
                .scheme(scheme)
                .variant(variant)
                .maskedCardNumber(maskCardNumber(cardNumber))
                .cardNumberHash(cvvEncoder.encode(cardNumber))
                .cardHolderName(account.getCustomer().getFirstName() + " " +
                                account.getCustomer().getLastName())
                .expiryDate(LocalDate.now().plusYears(5))
                .cvvHash(cvvEncoder.encode(cvv))
                .status(CardStatus.ACTIVE)
                .creditLimit(creditLimit)
                .availableLimit(availableLimit != null ? availableLimit : BigDecimal.ZERO)
                .annualFee(annualFee)
                .perks(perks)
                .build();
    }

    private String generateCardNumber() {
        StringBuilder sb = new StringBuilder("4");
        Random r = new Random();
        for (int i = 0; i < 15; i++) sb.append(r.nextInt(10));
        return sb.toString();
    }

    private String generateCvv() {
        return String.format("%03d", new Random().nextInt(1000));
    }

    private String maskCardNumber(String n) {
        return "**** **** **** " + n.substring(n.length() - 4);
    }

    private CardResponse mapToResponse(Card card) {
        return CardResponse.builder()
                .id(card.getId())
                .accountNumber(card.getAccount().getAccountNumber())
                .cardType(card.getCardType())
                .scheme(card.getScheme())
                .variant(card.getVariant())
                .maskedCardNumber(card.getMaskedCardNumber())
                .cardHolderName(card.getCardHolderName())
                .expiryDate(card.getExpiryDate())
                .status(card.getStatus())
                .creditLimit(card.getCreditLimit())
                .availableLimit(card.getAvailableLimit())
                .prepaidBalance(card.getPrepaidBalance())
                .internationalEnabled(card.getInternationalEnabled())
                .onlineEnabled(card.getOnlineEnabled())
                .contactlessEnabled(card.getContactlessEnabled())
                .annualFee(card.getAnnualFee())
                .perks(card.getPerks())
                .createdAt(card.getCreatedAt())
                .build();
    }
}
