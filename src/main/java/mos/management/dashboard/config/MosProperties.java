package mos.management.dashboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.time.ZoneId;

/** Everything under mos.* in application.properties. */
@ConfigurationProperties(prefix = "mos")
public record MosProperties(Jwt jwt, Store store, Demo demo, String uploadDir) {

    public MosProperties {
        if (uploadDir == null || uploadDir.isBlank()) uploadDir = "uploads";
        if (demo == null) demo = new Demo(false);
    }

    public record Jwt(String secret, Duration ttl) {
        public Jwt {
            if (secret == null || secret.length() < 32) {
                throw new IllegalStateException(
                        "mos.jwt.secret (MOS_JWT_SECRET) must be at least 32 characters; see .env.example");
            }
            if (ttl == null) ttl = Duration.ofHours(12);
        }
    }

    public record Store(ZoneId zone) {
        public Store {
            if (zone == null) zone = ZoneId.of("Asia/Phnom_Penh");
        }
    }

    public record Demo(boolean enabled) {
    }
}
