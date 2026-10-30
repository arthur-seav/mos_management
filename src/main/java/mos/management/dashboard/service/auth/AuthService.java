package mos.management.dashboard.service.auth;

import mos.management.dashboard.dto.AuthDtos.ProfileUpdate;
import mos.management.dashboard.dto.AuthDtos.SignUp;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.entity.UserRole;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.UserRepository;
import mos.management.dashboard.util.PhoneNumbers;
import mos.management.dashboard.util.Text;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.Optional;

/**
 * Accounts and passwords: sign-in for both clients (FR-03), customer
 * sign-up (FR-02), forgotten-password reset (TC-05, TC-06), profile
 * (FR-04, TC-07) and change password (FR-30). Passwords are bcrypt
 * hashes (NFR-05).
 */
@Service
@Transactional
public class AuthService {

    /** Which client is signing in; decides which roles may (SA 1.5). */
    public enum Client { APP, DASHBOARD }

    public static final int MIN_PASSWORD = 8;
    static final String BAD_CREDENTIALS = "Incorrect email/phone or password.";

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final Clock clock;

    public AuthService(UserRepository users, PasswordEncoder passwords, TokenService tokens, Clock clock) {
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.clock = clock;
    }

    public record SignedIn(String token, User user) {
    }

    @Transactional(readOnly = true)
    public SignedIn signIn(String identifier, String password, Client client) {
        User user = findByIdentifier(identifier)
                .filter(u -> passwords.matches(password == null ? "" : password, u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "bad_credentials", BAD_CREDENTIALS));
        if (!user.isActive()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "account_inactive",
                    "This account has been deactivated. Contact the store.");
        }
        boolean allowed = client == Client.APP ? user.getRole() == UserRole.CUSTOMER : user.getRole().worksOnDashboard();
        if (!allowed) {
            throw new ApiException(HttpStatus.FORBIDDEN, "wrong_client", client == Client.APP
                    ? "Staff accounts sign in on the store dashboard."
                    : "Customer accounts sign in on the MOS app.");
        }
        return new SignedIn(tokens.accessToken(user), user);
    }

    /** FR-02: a new customer, signed in at once (TC-02). */
    public SignedIn signUp(SignUp request) {
        String email = normalizeEmail(request.email());
        String phone = normalizePhone(request.phone());
        if (email == null && phone == null) {
            throw ApiException.badRequest("contact_required", "Enter an email or a phone number.");
        }
        checkPassword(request.password());
        if (email != null && users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("email_taken", "This email is already registered.");      // TC-03
        }
        if (phone != null && users.existsByPhone(phone)) {
            throw ApiException.conflict("phone_taken", "This phone number is already registered."); // TC-03
        }
        User user = new User(Text.trimOrEmpty(request.firstName()), Text.trimOrEmpty(request.lastName()), email, phone,
                passwords.encode(request.password()), UserRole.CUSTOMER, clock.instant());
        user.setDateOfBirth(request.dateOfBirth());
        users.save(user);
        return new SignedIn(tokens.accessToken(user), user);
    }

    /** Step 1 of a reset: the phone must belong to a customer (TC-06). */
    @Transactional(readOnly = true)
    public String verifyForReset(String phone) {
        User user = normalizePhoneOrNull(phone)
                .flatMap(users::findByPhone)
                .filter(u -> u.getRole() == UserRole.CUSTOMER && u.isActive())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "account_not_found", "Account not found."));
        return tokens.resetTicket(user);
    }

    /** Step 2: the new password works and the old one does not (TC-05). */
    public void resetPassword(String ticket, String newPassword) {
        checkPassword(newPassword);
        User user = users.findById(tokens.userIdFromResetTicket(ticket))
                .orElseThrow(() -> ApiException.notFound("Account"));
        user.setPasswordHash(passwords.encode(newPassword));
        user.setUpdatedAt(clock.instant());
    }

    /** FR-30, for every role. */
    public void changePassword(long userId, String currentPassword, String newPassword) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        if (currentPassword == null || !passwords.matches(currentPassword, user.getPasswordHash())) {
            throw ApiException.badRequest("wrong_password", "Your current password is not correct.");
        }
        checkPassword(newPassword);
        if (passwords.matches(newPassword, user.getPasswordHash())) {
            throw ApiException.badRequest("same_password", "Choose a password different from the current one.");
        }
        user.setPasswordHash(passwords.encode(newPassword));
        user.setUpdatedAt(clock.instant());
    }

    /** FR-04, TC-07. Keeps an email or a phone; both must be free. */
    public User updateProfile(long userId, ProfileUpdate update) {
        User user = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        String email = normalizeEmail(update.email());
        String phone = normalizePhone(update.phone());
        if (email == null && phone == null) {
            throw ApiException.badRequest("contact_required", "Keep an email or a phone number.");
        }
        if (email != null && users.findByEmailIgnoreCase(email).filter(u -> !u.getId().equals(userId)).isPresent()) {
            throw ApiException.conflict("email_taken", "This email is already registered.");
        }
        if (phone != null && users.findByPhone(phone).filter(u -> !u.getId().equals(userId)).isPresent()) {
            throw ApiException.conflict("phone_taken", "This phone number is already registered.");
        }
        user.setFirstName(Text.trimOrEmpty(update.firstName()));
        user.setLastName(Text.trimOrEmpty(update.lastName()));
        user.setEmail(email);
        user.setPhone(phone);
        user.setDateOfBirth(update.dateOfBirth());
        user.setUpdatedAt(clock.instant());
        return user;
    }

    public String hash(String rawPassword) {
        checkPassword(rawPassword);
        return passwords.encode(rawPassword);
    }

    private Optional<User> findByIdentifier(String identifier) {
        String text = Text.trimOrEmpty(identifier);
        if (text.contains("@")) return users.findByEmailIgnoreCase(text);
        return PhoneNumbers.normalize(text).flatMap(users::findByPhone);
    }

    static void checkPassword(String password) {
        if (password == null || password.length() < MIN_PASSWORD) {
            throw ApiException.badRequest("weak_password", "Use at least " + MIN_PASSWORD + " characters.");
        }
    }

    static String normalizeEmail(String email) {
        String e = Text.blankToNull(email);
        if (e == null) return null;
        if (!e.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw ApiException.badRequest("invalid_email", "Enter a valid email.");
        }
        return e.toLowerCase();
    }

    static String normalizePhone(String phone) {
        if (Text.blankToNull(phone) == null) return null;
        return PhoneNumbers.normalize(phone)
                .orElseThrow(() -> ApiException.badRequest("invalid_phone", "Enter a valid phone number."));
    }

    private static Optional<String> normalizePhoneOrNull(String phone) {
        return PhoneNumbers.normalize(phone);
    }
}
