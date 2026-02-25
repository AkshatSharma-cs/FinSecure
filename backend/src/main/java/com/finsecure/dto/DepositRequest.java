package com.finsecure.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DepositRequest {

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "100.00", message = "Minimum deposit is ₹100")
    @DecimalMax(value = "10000000.00", message = "Maximum deposit is ₹1 crore")
    private BigDecimal amount;

    private String description;
}
