package mos.management.dashboard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.time.ZoneId;
import java.util.List;

/** Everything under mos.* in application.properties. */
@ConfigurationProperties(prefix = "mos")
public record MosProperties(Jwt jwt, Store store, Demo demo, String uploadDir, Cors cors) {

    public MosProperties {
        if (uploadDir == null || uploadDir.isBlank()) uploadDir = "uploads";
        if (demo == null) demo = new Demo(false);
        if (cors == null) cors = new Cors(null);
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

    /** Origins (patterns) allowed to call /api/app/** from a browser, e.g. the Flutter web dev server. */
    public record Cors(List<String> appOrigins) {
        public Cors {
            if (appOrigins == null || appOrigins.isEmpty()) appOrigins = List.of("http://localhost:*", "http://127.0.0.1:*");
        }
    }
}
