package com.finsecure.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IssueCreditCardRequest {

    @NotNull(message = "Account ID is required")
    private Long accountId;

    @NotBlank(message = "Card scheme is required")
    private String scheme; // CLASSIC, GOLD, PLATINUM, SIGNATURE

    @NotBlank(message = "Card variant is required")
    private String variant; // REGULAR, VIRTUAL
}
