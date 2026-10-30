package mos.management.dashboard.service.auth;

import mos.management.dashboard.entity.User;
import mos.management.dashboard.repository.UserRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Turns a valid token into ROLE_CUSTOMER / ROLE_STAFF / ROLE_ADMIN, reading
 * the role from the database rather than the token. A deactivated account
 * (FR-27, FR-31) or a changed role takes effect on the next request.
 */
@Component
public class ActiveUserJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository users;

    public ActiveUserJwtConverter(UserRepository users) {
        this.users = users;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        User user = users.findById(Long.valueOf(jwt.getSubject()))
                .filter(User::isActive)
                .orElseThrow(() -> new InvalidBearerTokenException("Account not active"));
        var role = new SimpleGrantedAuthority("ROLE_" + user.getRole().name());
        return new JwtAuthenticationToken(jwt, List.of(role), jwt.getSubject());
    }
}
