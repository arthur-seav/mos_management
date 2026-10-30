package mos.management.dashboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import mos.management.dashboard.entity.AccountStatus;
import mos.management.dashboard.entity.UserRole;

/** Staff accounts (FR-27) and the customer list (FR-31). */
public final class AccountDtos {

    private AccountDtos() {
    }

    public record StaffRequest(@NotBlank(message = "Enter a first name.") @Size(max = 50) String firstName,
                               @Size(max = 50) String lastName,
                               @Size(max = 255) String email,
                               @Size(max = 20) String phone,
                               @NotNull(message = "Pick a role.") UserRole role,
                               String password) {
    }

    public record StatusRequest(@NotNull AccountStatus status) {
    }

    public record PasswordRequest(String newPassword) {
    }
}
