package mos.management.dashboard.config;

import mos.management.dashboard.DashboardApplication;
import mos.management.dashboard.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.jdbc.core.JdbcTemplate;

import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The server seeds a fresh database with a one-off command, without starting the
 * web server (deploy/README.md):
 * {@code java -jar app.jar --mos.demo.seed=true --spring.main.web-application-type=none}.
 * Runs that exact startup against its own PostgreSQL container. The server still
 * schedules its jobs ({@code ServerSchedulingTest}).
 */
class SeedCommandTest {

    @Test
    void seedRunsWithoutAWebServerAndFinishes() {
        try (var context = SpringApplication.run(
                new Class<?>[]{DashboardApplication.class, TestcontainersConfiguration.class},
                new String[]{
                        "--spring.profiles.active=test",
                        "--mos.demo.seed=true",
                        "--spring.main.web-application-type=none",
                        "--MOS_DEMO_ADMIN_PASSWORD=seed-command-admin",
                        "--MOS_DEMO_STAFF_PASSWORD=seed-command-staff"})) {
            var jdbc = context.getBean(JdbcTemplate.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM products", Integer.class)).isEqualTo(18);
            assertThat(jdbc.queryForList("SELECT email FROM users ORDER BY email", String.class))
                    .containsExactly("admin@mos.test", "staff@mos.test");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM products WHERE image_url LIKE '/demo-images/%.jpg'", Integer.class))
                    .isEqualTo(18);
            // No scheduler threads, so the JVM can exit once the seed is done.
            assertThat(context.getBeanNamesForType(ScheduledAnnotationBeanPostProcessor.class).length > 0).isFalse();
        }
    }
}
