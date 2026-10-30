package mos.management.dashboard.service.account;

import mos.management.dashboard.dto.AccountDtos.StaffRequest;
import mos.management.dashboard.dto.AdminOrderDtos.PageView;
import mos.management.dashboard.dto.AuthDtos.UserView;
import mos.management.dashboard.entity.AccountStatus;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.entity.UserRole;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.UserRepository;
import mos.management.dashboard.service.auth.AuthService;
import mos.management.dashboard.util.PhoneNumbers;
import mos.management.dashboard.util.Text;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;

/**
 * Admins manage staff accounts and roles (FR-27) and can deactivate
 * customers (FR-31). An admin can't lock themselves out.
 */
@Service
@Transactional
public class AccountService {

    private static final EnumSet<UserRole> STAFF_ROLES = EnumSet.of(UserRole.STAFF, UserRole.ADMIN);

    private final UserRepository users;
    private final AuthService auth;
    private final Clock clock;

    public AccountService(UserRepository users, AuthService auth, Clock clock) {
        this.users = users;
        this.auth = auth;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageView<UserView> staff(String q, int page, int size) {
        return search(STAFF_ROLES, q, page, size);
    }

    @Transactional(readOnly = true)
    public PageView<UserView> customers(String q, int page, int size) {
        return search(EnumSet.of(UserRole.CUSTOMER), q, page, size);
    }

    private PageView<UserView> search(EnumSet<UserRole> roles, String q, int page, int size) {
        var result = users.search(roles, Text.trimOrEmpty(q).toLowerCase(Locale.ROOT),
                PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 100), Sort.by("firstName", "lastName", "id")));
        return new PageView<>(result.getContent().stream().map(UserView::of).toList(), result.getNumber(),
                result.getSize(), result.getTotalElements());
    }

    public UserView createStaff(StaffRequest req) {
        requireStaffRole(req.role());
        String email = email(req.email());
        String phone = phone(req.phone());
        if (email == null && phone == null) throw ApiException.badRequest("contact_required", "Enter an email or a phone number.");
        checkFree(email, phone, null);
        User user = new User(req.firstName().trim(), Text.trimOrEmpty(req.lastName()), email, phone,
                auth.hash(req.password()), req.role(), clock.instant());
        return UserView.of(users.save(user));
    }

    public UserView updateStaff(long id, long adminId, StaffRequest req) {
        User user = staffAccount(id);
        requireStaffRole(req.role());
        if (id == adminId && req.role() != UserRole.ADMIN) {
            throw ApiException.conflict("self_lockout", "You can't remove your own admin role.");
        }
        String email = email(req.email());
        String phone = phone(req.phone());
        if (email == null && phone == null) throw ApiException.badRequest("contact_required", "Enter an email or a phone number.");
        checkFree(email, phone, id);
        user.setFirstName(req.firstName().trim());
        user.setLastName(Text.trimOrEmpty(req.lastName()));
        user.setEmail(email);
        user.setPhone(phone);
        user.setRole(req.role());
        user.setUpdatedAt(clock.instant());
        return UserView.of(user);
    }

    /** FR-27: deactivate and reactivate. Signed-in sessions end at once (ActiveUserJwtConverter). */
    public UserView setStaffStatus(long id, long adminId, AccountStatus status) {
        User user = staffAccount(id);
        if (id == adminId && status == AccountStatus.INACTIVE) {
            throw ApiException.conflict("self_lockout", "You can't deactivate your own account.");
        }
        user.setStatus(status);
        user.setUpdatedAt(clock.instant());
        return UserView.of(user);
    }

    /** For "Forgot your password? Ask the store admin." */
    public UserView setStaffPassword(long id, String newPassword) {
        User user = staffAccount(id);
        user.setPasswordHash(auth.hash(newPassword));
        user.setUpdatedAt(clock.instant());
        return UserView.of(user);
    }

    /** FR-31. */
    public UserView setCustomerStatus(long id, AccountStatus status) {
        User user = users.findById(id).filter(u -> u.getRole() == UserRole.CUSTOMER)
                .orElseThrow(() -> ApiException.notFound("Customer"));
        user.setStatus(status);
        user.setUpdatedAt(clock.instant());
        return UserView.of(user);
    }

    private User staffAccount(long id) {
        return users.findById(id).filter(u -> STAFF_ROLES.contains(u.getRole()))
                .orElseThrow(() -> ApiException.notFound("Staff account"));
    }

    private static void requireStaffRole(UserRole role) {
        if (!STAFF_ROLES.contains(role)) throw ApiException.badRequest("bad_role", "Pick Staff or Admin.");
    }

    private void checkFree(String email, String phone, Long self) {
        if (email != null && users.findByEmailIgnoreCase(email).filter(u -> !u.getId().equals(self)).isPresent()) {
            throw ApiException.conflict("email_taken", "This email is already used by another account.");
        }
        if (phone != null && users.findByPhone(phone).filter(u -> !u.getId().equals(self)).isPresent()) {
            throw ApiException.conflict("phone_taken", "This phone number is already used by another account.");
        }
    }

    private static String email(String value) {
        String e = Text.blankToNull(value);
        if (e == null) return null;
        if (!e.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw ApiException.badRequest("invalid_email", "Enter a valid email.");
        return e.toLowerCase(Locale.ROOT);
    }

    private static String phone(String value) {
        if (Text.blankToNull(value) == null) return null;
        return PhoneNumbers.normalize(value)
                .orElseThrow(() -> ApiException.badRequest("invalid_phone", "Enter a valid phone number."));
    }
}
