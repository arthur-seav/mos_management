package mos.management.dashboard.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Background jobs (BR-08: abandon unpaid orders) run in the server only. The
 * one-off seed command starts without a web server and must exit when done;
 * the scheduler's threads would keep its JVM alive.
 */
@Configuration
@ConditionalOnWebApplication
@EnableScheduling
public class SchedulingConfig {
}
