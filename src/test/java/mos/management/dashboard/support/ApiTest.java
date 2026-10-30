package mos.management.dashboard.support;

import mos.management.dashboard.TestcontainersConfiguration;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.entity.UserRole;
import mos.management.dashboard.repository.UserRepository;
import mos.management.dashboard.service.auth.TokenService;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * Base for API tests: the whole app on a real PostgreSQL, wiped before
 * each test (the store settings row and opening hours are kept, reset to
 * their defaults).
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({TestcontainersConfiguration.class, TestClockConfig.class})
public abstract class ApiTest {

    public static final String PASSWORD = "secret123";

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected JdbcTemplate jdbc;
    @Autowired
    protected UserRepository users;
    @Autowired
    protected PasswordEncoder passwordEncoder;
    @Autowired
    protected TokenService tokens;
    @Autowired
    protected TestClockConfig.MutableClock clock;

    @BeforeEach
    void wipeDatabase() {
        clock.reset();
        jdbc.execute("""
                TRUNCATE order_item_options, order_items, payments, orders, saved_cards,
                         product_options, product_option_groups, options, option_groups,
                         products, categories, users RESTART IDENTITY CASCADE
                """);
        jdbc.update("""
                UPDATE store_settings SET store_name = 'MOS Coffee', address = 'Phnom Penh', phone = '012 345 678',
                  slot_interval_min = 15, min_prep_min = 30, pickup_timeout_min = 30,
                  online_ordering_open = TRUE, asap_prep_min = 10
                """);
        jdbc.update("UPDATE opening_hours SET open_time = '07:00', close_time = '21:00', is_closed = FALSE");
    }

    protected User user(UserRole role, String email, String phone) {
        return users.save(new User("Test", role.dbValue(), email, phone, passwordEncoder.encode(PASSWORD), role,
                Instant.parse("2026-10-01T00:00:00Z")));
    }

    protected User customer() {
        return user(UserRole.CUSTOMER, "customer@example.com", "012345678");
    }

    protected User staff() {
        return user(UserRole.STAFF, "staff@example.com", null);
    }

    protected User admin() {
        return user(UserRole.ADMIN, "admin@example.com", null);
    }

    protected String bearer(User user) {
        return "Bearer " + tokens.accessToken(user);
    }

    protected MockHttpServletRequestBuilder getAs(User user, String url) {
        return get(url).header("Authorization", bearer(user));
    }

    protected MockHttpServletRequestBuilder postAs(User user, String url, String json) {
        return post(url).header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON).content(json);
    }

    protected MockHttpServletRequestBuilder putAs(User user, String url, String json) {
        return put(url).header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON).content(json);
    }

    protected MockHttpServletRequestBuilder patchAs(User user, String url, String json) {
        return patch(url).header("Authorization", bearer(user)).contentType(MediaType.APPLICATION_JSON).content(json);
    }

    protected MockHttpServletRequestBuilder deleteAs(User user, String url) {
        return delete(url).header("Authorization", bearer(user));
    }

    protected MockHttpServletRequestBuilder postJson(String url, String json) {
        return post(url).contentType(MediaType.APPLICATION_JSON).content(json);
    }
}
