package com.finsecure.dto;

import com.finsecure.entity.KycDocument.DocumentStatus;
import com.finsecure.entity.KycDocument.DocumentType;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class KycDocumentResponse {

    private Long id;
    private Long customerId;
    private String customerName;
    private DocumentType documentType;
    private String documentNumber;
    private String fileName;
    /** True when binary PDF data is present — lets the frontend show a View button. */
    private boolean hasFile;
    private DocumentStatus status;
    private String rejectionReason;
    private LocalDateTime verifiedAt;
    private LocalDateTime createdAt;
}