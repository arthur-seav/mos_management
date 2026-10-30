package mos.management.dashboard.service.demo;

import mos.management.dashboard.dto.MenuDtos.CustomizationView;
import mos.management.dashboard.service.menu.MenuAdminService;
import mos.management.dashboard.service.menu.MenuQueryService;
import mos.management.dashboard.support.ApiTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

import static org.assertj.core.api.Assertions.*;
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

    @Test
    void repeatSeedRefusesWithoutChangingAnything() {
        seed.seed(PASSWORD, PASSWORD);
        assertThatThrownBy(() -> seed.seed(PASSWORD, PASSWORD)).isInstanceOf(IllegalStateException.class).hasMessageContaining("empty database");
        assertThat(menu.products()).hasSize(18);
        assertThat(users.count()).isEqualTo(2);
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
