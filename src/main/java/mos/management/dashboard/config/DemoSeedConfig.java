package mos.management.dashboard.config;

import mos.management.dashboard.service.demo.DemoSeedService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Opt-in only: normal startup never inserts accounts or demo menu data. */
@Configuration
public class DemoSeedConfig {
    @Bean
    @ConditionalOnProperty(name = "mos.demo.seed", havingValue = "true")
    ApplicationRunner demoSeedRunner(DemoSeedService seed,
                                    @Value("${MOS_DEMO_ADMIN_PASSWORD:}") String adminPassword,
                                    @Value("${MOS_DEMO_STAFF_PASSWORD:}") String staffPassword) {
        return args -> {
            seed.seed(adminPassword, staffPassword);
            System.out.println("MOS demo seed completed. Credentials were supplied at runtime and are not printed.");
        };
    }
}
