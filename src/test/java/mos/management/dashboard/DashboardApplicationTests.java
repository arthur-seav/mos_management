package mos.management.dashboard;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Starts the whole app on a real PostgreSQL. Flyway builds the schema and
 * Hibernate (ddl-auto=validate) checks every entity against it, so a
 * mapping that does not match the data dictionary fails here.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
class DashboardApplicationTests {

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    MockMvc mvc;

    @Test
    void schemaHasTheFourteenTablesOfTheDataDictionary() {
        var tables = jdbc.queryForList("""
                select table_name from information_schema.tables
                where table_schema = 'public' and table_name <> 'flyway_schema_history'
                order by table_name
                """, String.class);
        assertThat(tables).containsExactly(
                "categories", "opening_hours", "option_groups", "options", "order_item_options",
                "order_items", "orders", "payments", "product_option_groups", "product_options",
                "products", "saved_cards", "store_settings", "users");
    }

    @Test
    void storeStartsWithOneSettingsRowAndSevenDays() {
        assertThat(jdbc.queryForObject("select count(*) from store_settings", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from opening_hours", Integer.class)).isEqualTo(7);
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void unknownApiPathIsNotAnswerdWithTheDashboardPage() throws Exception {
        mvc.perform(get("/api/app/nothing-here")).andExpect(status().is4xxClientError());
    }
}
