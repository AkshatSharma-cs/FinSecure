package com.finsecure.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "cards", indexes = {
    @Index(name = "idx_cards_number", columnList = "maskedCardNumber"),
    @Index(name = "idx_cards_account", columnList = "account_id")
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Card {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CardType cardType;

    @Column(length = 20)
    @Builder.Default
    private String scheme = "CLASSIC"; // CLASSIC, GOLD, PLATINUM, SIGNATURE

    @Column(length = 20)
    @Builder.Default
    private String variant = "REGULAR"; // REGULAR, VIRTUAL

    @Column(nullable = false, length = 20)
    private String maskedCardNumber;

    @Column(nullable = false)
    private String cardNumberHash;

    @Column(nullable = false, length = 200)
    private String cardHolderName;

    @Column(nullable = false)
    private LocalDate expiryDate;

    @Column(nullable = false)
    private String cvvHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CardStatus status = CardStatus.ACTIVE;

    @Column(precision = 12, scale = 2)
    private BigDecimal creditLimit;

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal availableLimit = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal prepaidBalance = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private Boolean internationalEnabled = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean onlineEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private Boolean contactlessEnabled = true;

    @Column
    @Builder.Default
    private Integer annualFee = 0;

    @Column(length = 500)
    private String perks;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum CardType {
        DEBIT, CREDIT, PREPAID
    }

    public enum CardStatus {
        ACTIVE, BLOCKED, EXPIRED, CANCELLED, PENDING_ACTIVATION
    }
}
