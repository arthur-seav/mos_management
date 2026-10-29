package mos.management.dashboard.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;

@Configuration
@EnableScheduling
@EnableConfigurationProperties(MosProperties.class)
public class AppConfig {

    /** Every "now" goes through this, so tests can move time. */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
