package mos.management.dashboard.config;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;

import java.util.TimeZone;

/**
 * Runs the JVM in UTC, before anything touches the database. Every
 * TIMESTAMP column holds UTC, and with the JVM in another zone Hibernate
 * shifts TIME columns too (opening hours 07:00 read back as 14:00 in
 * Phnom Penh). Store-local times always go through mos.store.zone.
 * Registered in META-INF/spring.factories, so tests get it as well.
 */
public class UtcTimeZone implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }
}
