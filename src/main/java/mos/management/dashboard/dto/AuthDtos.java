package mos.management.dashboard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import mos.management.dashboard.entity.AccountStatus;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.entity.UserRole;

import java.time.Instant;
import java.time.LocalDate;

/** Request and response bodies for sign-in and accounts. */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record SignInRequest(@NotBlank(message = "Enter your email or phone number.") String identifier,
                                @NotBlank(message = "Enter your password.") String password) {
    }

    public record SignUp(@NotBlank(message = "Enter your name.") @Size(max = 50) String firstName,
                         @Size(max = 50) String lastName,
                         @Size(max = 255) String email,
                         @Size(max = 20) String phone,
                         String password,
                         LocalDate dateOfBirth) {
    }

    public record ResetVerifyRequest(@NotBlank(message = "Enter your phone number.") String phone) {
    }

    public record ResetTicket(String ticket) {
    }

    public record ResetRequest(@NotBlank String ticket, String newPassword) {
    }

    public record ChangePasswordRequest(String currentPassword, String newPassword) {
    }

    public record ProfileUpdate(@NotBlank(message = "Enter your name.") @Size(max = 50) String firstName,
                                @Size(max = 50) String lastName,
                                @Size(max = 255) String email,
                                @Size(max = 20) String phone,
                                LocalDate dateOfBirth) {
    }

    /** A user as the API shows it. The password hash never leaves the server. */
    public record UserView(long id, String firstName, String lastName, String email, String phone,
                           UserRole role, AccountStatus status, LocalDate dateOfBirth, Instant createdAt) {
        public static UserView of(User u) {
            return new UserView(u.getId(), u.getFirstName(), u.getLastName(), u.getEmail(), u.getPhone(),
                    u.getRole(), u.getStatus(), u.getDateOfBirth(), u.getCreatedAt());
        }
    }

    public record SignInResponse(String token, UserView user) {
    }
}
