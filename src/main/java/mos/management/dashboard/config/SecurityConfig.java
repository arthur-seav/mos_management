package mos.management.dashboard.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import mos.management.dashboard.service.auth.ActiveUserJwtConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.crypto.SecretKey;
import java.time.Clock;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Stateless JWT sign-in for both clients (NFR-06).
 * <ul>
 *   <li>{@code /api/app/**}: the customer app. Menu and store info are public (FR-01).</li>
 *   <li>{@code /api/admin/**}: the dashboard, staff and admins only (SA 1.5).
 *       Admin-only actions are marked with {@code @PreAuthorize} on the controllers.</li>
 *   <li>Everything else is the dashboard's static files.</li>
 * </ul>
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    /** The "typ" claim of a normal sign-in token (reset tickets use another). */
    public static final String ACCESS_TOKEN = "access";

    @Bean
    SecurityFilterChain api(HttpSecurity http, ActiveUserJwtConverter converter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())   // bearer tokens only, no cookies
                .cors(cors -> {})                // uses the corsConfigurationSource bean below
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/api/app/auth/**", "/api/admin/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/app/menu/**", "/api/app/store").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/app/menu/unavailable").permitAll()
                        .requestMatchers("/api/admin/**").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers("/api/app/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/**", "/actuator/**").denyAll()
                        .anyRequest().permitAll())
                .oauth2ResourceServer(o -> o.jwt(jwt -> jwt.jwtAuthenticationConverter(converter)));
        return http.build();
    }

    /**
     * The Flutter web build runs on its own origin during development (flutter run -d chrome),
     * so /api/app/** answers cross-origin calls from mos.cors.app-origins. Bearer tokens only:
     * no cookies, so credentials stay off. The dashboard is same-origin and gets no CORS.
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(MosProperties properties) {
        var app = new CorsConfiguration();
        app.setAllowedOriginPatterns(properties.cors().appOrigins());
        app.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        app.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        app.setAllowCredentials(false);
        app.setMaxAge(3600L);
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/app/**", app);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();   // bcrypt (NFR-05)
    }

    @Bean
    SecretKey jwtKey(MosProperties properties) {
        return new SecretKeySpec(properties.jwt().secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey jwtKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtKey));
    }

    /** Accepts only sign-in tokens; a password-reset ticket is not a session. */
    @Bean
    JwtDecoder jwtDecoder(SecretKey jwtKey, Clock clock) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(jwtKey).macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> accessOnly = jwt -> ACCESS_TOKEN.equals(jwt.getClaimAsString("typ"))
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Not a sign-in token", null));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(timestamps(clock), accessOnly));
        return decoder;
    }

    /** Expiry checked against the app clock (tests move it). */
    public static JwtTimestampValidator timestamps(Clock clock) {
        JwtTimestampValidator validator = new JwtTimestampValidator();
        validator.setClock(clock);
        return validator;
    }
}
