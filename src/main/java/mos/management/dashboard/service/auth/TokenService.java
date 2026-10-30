package mos.management.dashboard.service.auth;

import mos.management.dashboard.config.MosProperties;
import mos.management.dashboard.config.SecurityConfig;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Signs the two kinds of token: a sign-in token (typ=access) and a
 * short-lived password-reset ticket (typ=password_reset, SA 4.2.1.3).
 * The API only accepts the first kind (see {@link SecurityConfig#jwtDecoder}).
 */
@Service
public class TokenService {

    static final String RESET_TICKET = "password_reset";
    static final Duration RESET_TTL = Duration.ofMinutes(10);

    private final JwtEncoder encoder;
    private final NimbusJwtDecoder ticketDecoder;
    private final Duration accessTtl;
    private final Clock clock;

    public TokenService(JwtEncoder encoder, SecretKey jwtKey, MosProperties properties, Clock clock) {
        this.encoder = encoder;
        this.ticketDecoder = NimbusJwtDecoder.withSecretKey(jwtKey).macAlgorithm(MacAlgorithm.HS256).build();
        this.ticketDecoder.setJwtValidator(SecurityConfig.timestamps(clock));
        this.accessTtl = properties.jwt().ttl();
        this.clock = clock;
    }

    public String accessToken(User user) {
        return sign(user, SecurityConfig.ACCESS_TOKEN, accessTtl);
    }

    public String resetTicket(User user) {
        return sign(user, RESET_TICKET, RESET_TTL);
    }

    /** The user id in a valid, unexpired reset ticket. */
    public long userIdFromResetTicket(String ticket) {
        try {
            Jwt jwt = ticketDecoder.decode(ticket);
            if (!RESET_TICKET.equals(jwt.getClaimAsString("typ"))) throw new JwtException("wrong type");
            return Long.parseLong(jwt.getSubject());
        } catch (JwtException | NumberFormatException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "reset_expired", "This reset link has expired. Start again.");
        }
    }

    private String sign(User user, String type, Duration ttl) {
        Instant now = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("mos")
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .claim("typ", type)
                .claim("role", user.getRole().dbValue())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
