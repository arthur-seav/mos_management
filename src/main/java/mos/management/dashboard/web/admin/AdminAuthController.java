package mos.management.dashboard.web.admin;

import jakarta.validation.Valid;
import mos.management.dashboard.dto.AuthDtos.ChangePasswordRequest;
import mos.management.dashboard.dto.AuthDtos.SignInRequest;
import mos.management.dashboard.dto.AuthDtos.SignInResponse;
import mos.management.dashboard.dto.AuthDtos.UserView;
import mos.management.dashboard.service.auth.AuthService;
import mos.management.dashboard.service.auth.AuthService.Client;
import mos.management.dashboard.service.auth.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Staff and admin sign-in for the dashboard (FR-03, FR-30). */
@RestController
@RequestMapping("/api/admin")
public class AdminAuthController {

    private final AuthService auth;
    private final CurrentUser currentUser;

    public AdminAuthController(AuthService auth, CurrentUser currentUser) {
        this.auth = auth;
        this.currentUser = currentUser;
    }

    @PostMapping("/auth/sign-in")
    public SignInResponse signIn(@Valid @RequestBody SignInRequest body) {
        var signedIn = auth.signIn(body.identifier(), body.password(), Client.DASHBOARD);
        return new SignInResponse(signedIn.token(), UserView.of(signedIn.user()));
    }

    @GetMapping("/me")
    public UserView me() {
        return UserView.of(currentUser.get());
    }

    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@RequestBody ChangePasswordRequest body) {
        auth.changePassword(currentUser.id(), body.currentPassword(), body.newPassword());
    }
}
