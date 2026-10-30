package mos.management.dashboard.web.admin;

import jakarta.validation.Valid;
import mos.management.dashboard.dto.AccountDtos.PasswordRequest;
import mos.management.dashboard.dto.AccountDtos.StaffRequest;
import mos.management.dashboard.dto.AccountDtos.StatusRequest;
import mos.management.dashboard.dto.AdminOrderDtos.PageView;
import mos.management.dashboard.dto.AuthDtos.UserView;
import mos.management.dashboard.service.account.AccountService;
import mos.management.dashboard.service.auth.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Accounts: admins only (SA 1.5: staff have no access to account management). */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAccountController {

    private final AccountService accounts;
    private final CurrentUser currentUser;

    public AdminAccountController(AccountService accounts, CurrentUser currentUser) {
        this.accounts = accounts;
        this.currentUser = currentUser;
    }

    @GetMapping("/staff")
    public PageView<UserView> staff(@RequestParam(required = false) String q,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        return accounts.staff(q, page, size);
    }

    @PostMapping("/staff")
    @ResponseStatus(HttpStatus.CREATED)
    public UserView createStaff(@Valid @RequestBody StaffRequest body) {
        return accounts.createStaff(body);
    }

    @PutMapping("/staff/{id}")
    public UserView updateStaff(@PathVariable long id, @Valid @RequestBody StaffRequest body) {
        return accounts.updateStaff(id, currentUser.id(), body);
    }

    @PatchMapping("/staff/{id}/status")
    public UserView setStaffStatus(@PathVariable long id, @Valid @RequestBody StatusRequest body) {
        return accounts.setStaffStatus(id, currentUser.id(), body.status());
    }

    @PostMapping("/staff/{id}/password")
    public UserView setStaffPassword(@PathVariable long id, @RequestBody PasswordRequest body) {
        return accounts.setStaffPassword(id, body.newPassword());
    }

    @GetMapping("/customers")
    public PageView<UserView> customers(@RequestParam(required = false) String q,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return accounts.customers(q, page, size);
    }

    @PatchMapping("/customers/{id}/status")
    public UserView setCustomerStatus(@PathVariable long id, @Valid @RequestBody StatusRequest body) {
        return accounts.setCustomerStatus(id, body.status());
    }
}
