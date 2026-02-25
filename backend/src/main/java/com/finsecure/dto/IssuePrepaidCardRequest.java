package com.finsecure.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IssuePrepaidCardRequest {

    @NotNull(message = "Account ID is required")
    private Long accountId;

    @NotNull(message = "Load amount is required")
    @DecimalMin(value = "500.00", message = "Minimum load is ₹500")
    @DecimalMax(value = "100000.00", message = "Maximum load is ₹1 lakh")
    private BigDecimal loadAmount;

    @NotBlank(message = "Card variant is required")
    private String variant; // REGULAR, VIRTUAL
}
