package mos.management.dashboard.config;

import mos.management.dashboard.support.ApiTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;

import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;

/** The running server keeps its background jobs (BR-08) after scheduling moved to SchedulingConfig. */
class ServerSchedulingTest extends ApiTest {
    @Autowired ApplicationContext context;

    @Test
    void theServerSchedulesItsJobs() {
        assertThat(context.getBeanNamesForType(ScheduledAnnotationBeanPostProcessor.class).length > 0).isTrue();
    }
}
