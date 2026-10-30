package mos.management.dashboard.web;

import mos.management.dashboard.entity.User;
import mos.management.dashboard.support.ApiTest;
import mos.management.dashboard.support.MenuFixture;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.ByteArrayInputStream;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Sales reports. Walk-in orders are used because they are placed at once, at the test clock's time. */
class AdminReportApiTest extends ApiTest {

    @Autowired
    MenuFixture menu;

    User admin;
    User staff;

    @BeforeEach
    void setUp() {
        menu.build();
        admin = admin();
        staff = staff();
    }

    String line(long productId, long optionId, int qty) {
        return "{\"productId\": %d, \"optionIds\": [%d], \"quantity\": %d}".formatted(productId, optionId, qty);
    }

    void walkIn(String... lines) throws Exception {
        mvc.perform(postAs(staff, "/api/admin/orders/walk-in", "{\"lines\": [" + String.join(",", lines) + "]}"))
                .andExpect(status().isCreated());
    }

    @Test
    void salesForAPeriodWithDaysAndSources() throws Exception {   // FR-28, 9.3
        clock.advance(Duration.ofDays(-1));
        walkIn(line(menu.mocha.getId(), menu.medium.getId(), 2));              // Wed: $8.20, 2 cups
        clock.advance(Duration.ofDays(1));
        walkIn(line(menu.mocha.getId(), menu.large.getId(), 1));               // Thu: $4.35, 1 cup
        mvc.perform(getAs(admin, "/api/admin/reports/sales?from=2026-10-27&to=2026-10-29"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orders").value(2))
                .andExpect(jsonPath("$.drinks").value(3))
                .andExpect(jsonPath("$.revenue").value(12.55))
                .andExpect(jsonPath("$.averageOrder").value(6.28))
                .andExpect(jsonPath("$.byDay[*].date").value(contains("2026-10-27", "2026-10-28", "2026-10-29")))
                .andExpect(jsonPath("$.byDay[*].revenue").value(contains(0.00, 8.20, 4.35)))
                .andExpect(jsonPath("$.bySource[1].source").value("walk_in"))
                .andExpect(jsonPath("$.bySource[1].orders").value(2));
        mvc.perform(getAs(admin, "/api/admin/reports/sales?from=2026-10-29&to=2026-10-29"))
                .andExpect(jsonPath("$.revenue").value(4.35));
    }

    @Test
    void bestSellersCountCups() throws Exception {   // FR-35
        walkIn(line(menu.mocha.getId(), menu.medium.getId(), 3));
        walkIn("{\"productId\": %d, \"optionIds\": [%d, %d, %d], \"quantity\": 1}".formatted(
                menu.americano.getId(), menu.small.getId(), menu.hot.getId(), menu.noSugar.getId()));
        mvc.perform(getAs(admin, "/api/admin/reports/best-sellers?from=2026-10-29&to=2026-10-29"))
                .andExpect(jsonPath("$[*].productName").value(contains("Mocha", "Americano")))
                .andExpect(jsonPath("$[0].quantity").value(3));
    }

    @Test
    void exportGivesAnExcelFileWithTheSameNumbers() throws Exception {   // FR-29
        walkIn(line(menu.mocha.getId(), menu.medium.getId(), 2));
        byte[] file = mvc.perform(getAs(admin, "/api/admin/reports/export?from=2026-10-29&to=2026-10-29"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"MOS-sales-2026-10-29-to-2026-10-29.xlsx\""))
                .andReturn().getResponse().getContentAsByteArray();
        try (var wb = new XSSFWorkbook(new ByteArrayInputStream(file))) {
            assertThat(wb.getSheetAt(0).getSheetName()).isEqualTo("Summary");
            assertThat(wb.getSheet("Summary").getRow(4).getCell(2).getNumericCellValue()).isEqualTo(8.20);
            assertThat(wb.getSheet("Best sellers").getRow(1).getCell(1).getStringCellValue()).isEqualTo("Mocha");
            assertThat(wb.getSheet("Orders").getRow(1).getCell(0).getStringCellValue()).isEqualTo("A001");
        }
    }

    @Test
    void rejectedAndCancelledOrdersAreNotSales() throws Exception {
        walkIn(line(menu.mocha.getId(), menu.medium.getId(), 1));
        jdbc.update("update orders set status = 'rejected', reject_reason = 'x'");
        mvc.perform(getAs(admin, "/api/admin/reports/sales?from=2026-10-29&to=2026-10-29"))
                .andExpect(jsonPath("$.orders").value(0))
                .andExpect(jsonPath("$.cancelledOrRejected").value(1));
    }

    @Test
    void reportsAreForAdminsButStaffSeeTheOverviewWithoutRevenue() throws Exception {   // SA 1.5
        walkIn(line(menu.mocha.getId(), menu.medium.getId(), 1));
        mvc.perform(getAs(staff, "/api/admin/reports/sales")).andExpect(status().isForbidden());
        mvc.perform(getAs(staff, "/api/admin/reports/export")).andExpect(status().isForbidden());
        mvc.perform(getAs(staff, "/api/admin/overview"))
                .andExpect(jsonPath("$.ordersToday").value(1))
                .andExpect(jsonPath("$.confirmed").value(1))
                .andExpect(jsonPath("$.revenueToday").isEmpty());
        mvc.perform(getAs(admin, "/api/admin/overview")).andExpect(jsonPath("$.revenueToday").value(4.10));
    }

    @Test
    void aBackwardsPeriodIsRefused() throws Exception {
        mvc.perform(getAs(admin, "/api/admin/reports/sales?from=2026-10-29&to=2026-10-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_period"));
    }

    @Test
    void appPopularDrinksAreTheBestSellersFirst() throws Exception {
        walkIn(line(menu.mocha.getId(), menu.medium.getId(), 5));
        mvc.perform(get("/api/app/menu/popular?limit=2"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Mocha"));
    }
}
