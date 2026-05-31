package com.finsecure.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "kyc_documents", indexes = {
    @Index(name = "idx_kyc_customer", columnList = "customer_id"),
    @Index(name = "idx_kyc_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class KycDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private Employee verifiedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DocumentType documentType;

    @Column(nullable = false, length = 100)
    private String documentNumber;

    // Kept for backwards-compatibility — no longer populated for new uploads
    @Column(length = 500)
    private String filePath;

    @Column(length = 100)
    private String fileName;

    @Column(length = 50)
    private String mimeType;

    // Actual PDF bytes stored in the database
    @Lob
    @Column(name = "file_data", columnDefinition = "MEDIUMBLOB")
    private byte[] fileData;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DocumentStatus status = DocumentStatus.UPLOADED;

    @Column(length = 500)
    private String rejectionReason;

    @Column
    private LocalDateTime verifiedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    public enum DocumentType {
        AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID, UTILITY_BILL, BANK_STATEMENT, SALARY_SLIP
    }

    public enum DocumentStatus {
        UPLOADED, UNDER_REVIEW, APPROVED, REJECTED
    }
}