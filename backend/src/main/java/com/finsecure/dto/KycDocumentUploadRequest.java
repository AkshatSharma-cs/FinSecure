package com.finsecure.dto;

import com.finsecure.entity.KycDocument.DocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class KycDocumentUploadRequest {

    @NotNull(message = "Document type is required")
    private DocumentType documentType;

    @NotBlank(message = "Document number is required")
    private String documentNumber;

    /**
     * Base64-encoded PDF data URI, e.g. "data:application/pdf;base64,JVBERi0x..."
     * The frontend reads the file with FileReader.readAsDataURL() and sends the result here.
     */
    @NotBlank(message = "File data is required")
    private String fileData;

    @NotBlank(message = "File name is required")
    private String fileName;
}