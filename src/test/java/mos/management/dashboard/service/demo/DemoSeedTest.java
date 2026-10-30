package mos.management.dashboard.service.demo;

import mos.management.dashboard.dto.MenuDtos.CustomizationView;
import mos.management.dashboard.service.menu.MenuAdminService;
import mos.management.dashboard.service.menu.MenuQueryService;
import mos.management.dashboard.support.ApiTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class DemoSeedTest extends ApiTest {
    @Autowired DemoSeedService seed;
    @Autowired MenuAdminService menu;
    @Autowired MenuQueryService query;

    @Test
    void freshDatabaseGetsFlutterCatalogAndFictionalAccounts() throws Exception {
        seed.seed(PASSWORD, PASSWORD);
        assertThat(menu.categories()).hasSize(4);
        assertThat(menu.products()).hasSize(18);
        assertThat(menu.products().stream().map(p -> p.name())).containsExactlyInAnyOrder(
                "Espresso", "Americano", "Cappuccino", "Caramel Latte", "Mocha", "Flat White", "Latte",
                "Jasmine Green Tea", "Thai Milk Tea", "Earl Grey Milk Tea", "Matcha Latte", "Caramel Frappé",
                "Mocha Frappé", "Matcha Frappé", "Hot Chocolate", "Strawberry Milk", "Lemon Soda", "Seasonal Smoothie");
        assertThat(menu.products().stream().filter(p -> p.name().equals("Mocha")).findFirst().orElseThrow().isAvailable()).isFalse();
        assertThat(menu.products().stream().filter(p -> p.name().equals("Seasonal Smoothie")).findFirst().orElseThrow().isActive()).isFalse();
        assertThat(users.findAll().stream().map(u -> u.fullName())).containsExactlyInAnyOrder("Vanna Chea", "Sophea Lim")
                .noneMatch(n -> n.toLowerCase().contains("arthur"));
        assertThat(users.findAll()).allSatisfy(u -> assertThat(u.getPasswordHash()).isNotEqualTo(PASSWORD));
        mvc.perform(postJson("/api/admin/auth/sign-in", "{\"identifier\":\"admin@mos.test\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("admin"));
    }

    @Test
    void demoCustomizationHasShotDiscountAndPerDrinkSizePrices() {
        seed.seed(PASSWORD, PASSWORD);
        var espresso = customization("Espresso");
        assertThat(espresso.groups().stream().map(g -> g.name())).containsExactly("Temperature", "Sweetness", "Add-ons", "Shots");
        var shots = espresso.groups().stream().filter(g -> g.name().equals("Shots")).findFirst().orElseThrow();
        assertThat(shots.options().getFirst().extraPrice()).isEqualByComparingTo("-0.50");
        var americanoSize = customization("Americano").groups().getFirst();
        assertThat(americanoSize.options().stream().filter(o -> o.name().equals("Large")).findFirst().orElseThrow().extraPrice()).isEqualByComparingTo("0.50");
        var latteSize = customization("Latte").groups().getFirst();
        assertThat(latteSize.options().stream().filter(o -> o.name().equals("Large")).findFirst().orElseThrow().extraPrice()).isEqualByComparingTo("1.00");
        assertThat(customization("Matcha Frappé").groups().stream().map(g -> g.name())).doesNotContain("Temperature").contains("Ice level");
    }

    /** Every demo drink shows its photo: a bundled JPEG served at /demo-images/. */
    @Test
    void everyDemoDrinkGetsItsBundledPhoto() throws Exception {
        seed.seed(PASSWORD, PASSWORD);
        assertThat(menu.products()).hasSize(18).allSatisfy(p -> assertThat(p.imageUrl()).startsWith("/demo-images/").endsWith(".jpg"));
        var hotChocolate = menu.products().stream().filter(p -> p.name().equals("Hot Chocolate")).findFirst().orElseThrow();
        assertThat(hotChocolate.imageUrl()).isEqualTo("/demo-images/hot-chocolate.jpg");
        assertThat(menu.products().stream().map(p -> p.imageUrl()).distinct()).hasSize(18);
        for (var p : menu.products()) {
            byte[] body = mvc.perform(get(p.imageUrl()))
                    .andExpect(status().isOk())
                    .andExpect(content().contentType("image/jpeg"))
                    .andExpect(header().string("Cache-Control", containsString("max-age=86400")))
                    .andReturn().getResponse().getContentAsByteArray();
            assertThat(body.length).as(p.name()).isBetween(10_000, 400_000);
            assertThat(new byte[]{body[0], body[1]}).as(p.name() + " is a JPEG").containsExactly(0xFF, 0xD8);
        }
    }

    @Test
    void aMissingPhotoIsNotFoundRatherThanTheDashboardPage() throws Exception {
        mvc.perform(get("/demo-images/nope.jpg")).andExpect(status().isNotFound());
    }

    @Test
    void flutterWebMayLoadPhotosFromItsDevOrigin() throws Exception {
        mvc.perform(get("/demo-images/latte.jpg").header("Origin", "http://localhost:53117"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:53117"));
        mvc.perform(get("/demo-images/latte.jpg").header("Origin", "https://evil.example"))
                .andExpect(status().isForbidden());
    }

    @Test
    void repeatSeedRefusesWithoutChangingAnything() {
        seed.seed(PASSWORD, PASSWORD);
        assertThatThrownBy(() -> seed.seed(PASSWORD, PASSWORD)).isInstanceOf(IllegalStateException.class).hasMessageContaining("already has a menu");
        assertThat(menu.products()).hasSize(18);
        assertThat(users.count()).isEqualTo(2);
    }

    /** A dev database that already has the admin but no menu: keep the admin, add menu and staff. */
    @Test
    void existingAdminIsKeptAndOnlyMissingPiecesAreAdded() throws Exception {
        seed.seed(PASSWORD, PASSWORD);
        var admin = users.findByEmailIgnoreCase("admin@mos.test").orElseThrow();
        String adminHash = admin.getPasswordHash();
        // Simulate "admin exists, no menu, no staff".
        jdbc.execute("DELETE FROM product_options; DELETE FROM product_option_groups; DELETE FROM options; "
                + "DELETE FROM option_groups; DELETE FROM products; DELETE FROM categories; DELETE FROM users WHERE email = 'staff@mos.test'");
        seed.seed(null, PASSWORD + "-staff");   // no admin password needed: the admin already exists
        assertThat(menu.products()).hasSize(18);
        assertThat(users.findByEmailIgnoreCase("admin@mos.test").orElseThrow().getPasswordHash()).isEqualTo(adminHash);
        mvc.perform(postJson("/api/admin/auth/sign-in", "{\"identifier\":\"staff@mos.test\",\"password\":\"" + PASSWORD + "-staff\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("staff"));
        mvc.perform(postJson("/api/admin/auth/sign-in", "{\"identifier\":\"admin@mos.test\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void missingPasswordDoesNotPartiallyCreateAccountsOrMenu() {
        assertThatThrownBy(() -> seed.seed(PASSWORD, "")).isInstanceOf(IllegalArgumentException.class);
        assertThat(users.count()).isZero();
        assertThat(menu.categories()).isEmpty();
    }

    private CustomizationView customization(String name) {
        var product = menu.products().stream().filter(p -> p.name().equals(name)).findFirst().orElseThrow();
        // Query via the public contract rather than rebuilding selection rules in this test.
        return query.customization(product.id());
    }
}
