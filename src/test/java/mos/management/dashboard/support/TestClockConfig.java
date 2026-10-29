package mos.management.dashboard.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** A clock the tests can set and move. Starts on Thu 29 Oct 2026, 10:00 in Phnom Penh. */
@TestConfiguration(proxyBeanMethods = false)
public class TestClockConfig {

    public static final Instant START = Instant.parse("2026-10-29T03:00:00Z");

    @Bean
    @Primary
    MutableClock mutableClock() {
        return new MutableClock();
    }

    public static class MutableClock extends Clock {
        private Instant now = START;

        public void reset() {
            now = START;
        }

        public void set(Instant instant) {
            now = instant;
        }

        public void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
