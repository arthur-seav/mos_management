package mos.management.dashboard.service.auth;

import mos.management.dashboard.entity.User;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/** The signed-in user of the current request. */
@Component
public class CurrentUser {

    private final UserRepository users;

    public CurrentUser(UserRepository users) {
        this.users = users;
    }

    public long id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "not_signed_in", "Sign in first.");
        }
        return Long.parseLong(auth.getName());
    }

    public User get() {
        return users.findById(id()).orElseThrow(() -> ApiException.notFound("Account"));
    }
}
