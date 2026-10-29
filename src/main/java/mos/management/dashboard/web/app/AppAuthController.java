package mos.management.dashboard.web.app;

import jakarta.validation.Valid;
import mos.management.dashboard.dto.AuthDtos.ChangePasswordRequest;
import mos.management.dashboard.dto.AuthDtos.ProfileUpdate;
import mos.management.dashboard.dto.AuthDtos.ResetRequest;
import mos.management.dashboard.dto.AuthDtos.ResetTicket;
import mos.management.dashboard.dto.AuthDtos.ResetVerifyRequest;
import mos.management.dashboard.dto.AuthDtos.SignInRequest;
import mos.management.dashboard.dto.AuthDtos.SignInResponse;
import mos.management.dashboard.dto.AuthDtos.SignUp;
import mos.management.dashboard.dto.AuthDtos.UserView;
import mos.management.dashboard.service.auth.AuthService;
import mos.management.dashboard.service.auth.AuthService.Client;
import mos.management.dashboard.service.auth.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Customer accounts for the app (FR-02 to FR-04, FR-30). Sign-out is the app dropping its token. */
@RestController
@RequestMapping("/api/app")
public class AppAuthController {

    private final AuthService auth;
    private final CurrentUser currentUser;

    public AppAuthController(AuthService auth, CurrentUser currentUser) {
        this.auth = auth;
        this.currentUser = currentUser;
    }

    @PostMapping("/auth/sign-in")
    public SignInResponse signIn(@Valid @RequestBody SignInRequest body) {
        var signedIn = auth.signIn(body.identifier(), body.password(), Client.APP);
        return new SignInResponse(signedIn.token(), UserView.of(signedIn.user()));
    }

    @PostMapping("/auth/sign-up")
    @ResponseStatus(HttpStatus.CREATED)
    public SignInResponse signUp(@Valid @RequestBody SignUp body) {
        var signedIn = auth.signUp(body);
        return new SignInResponse(signedIn.token(), UserView.of(signedIn.user()));
    }

    @PostMapping("/auth/reset/verify")
    public ResetTicket verifyForReset(@Valid @RequestBody ResetVerifyRequest body) {
        return new ResetTicket(auth.verifyForReset(body.phone()));
    }

    @PostMapping("/auth/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@Valid @RequestBody ResetRequest body) {
        auth.resetPassword(body.ticket(), body.newPassword());
    }

    @GetMapping("/me")
    public UserView me() {
        return UserView.of(currentUser.get());
    }

    @PutMapping("/me")
    public UserView updateProfile(@Valid @RequestBody ProfileUpdate body) {
        return UserView.of(auth.updateProfile(currentUser.id(), body));
    }

    @PostMapping("/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@RequestBody ChangePasswordRequest body) {
        auth.changePassword(currentUser.id(), body.currentPassword(), body.newPassword());
    }
}
