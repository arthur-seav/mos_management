package mos.management.dashboard.web;

import mos.management.dashboard.entity.User;
import mos.management.dashboard.support.ApiTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminStoreApiTest extends ApiTest {

    User admin;
    User staff;

    @BeforeEach
    void setUp() {
        admin = admin();
        staff = staff();
    }

    static String week(String sunday) {
        StringBuilder b = new StringBuilder("{\"days\": [");
        for (int d = 0; d < 7; d++) {
            if (d > 0) b.append(',');
            b.append(d == 0 ? sunday : "{\"dayOfWeek\": %d, \"openTime\": \"08:00\", \"closeTime\": \"20:00\"}".formatted(d));
        }
        return b.append("]}").toString();
    }

    @Test
    void adminSetsStoreInfoAndPickupRules() throws Exception {   // FR-36, FR-40
        mvc.perform(putAs(admin, "/api/admin/store/settings", """
                        {"storeName": "MOS Riverside", "address": "Sisowath Quay", "phone": "023 456 789",
                         "slotIntervalMin": 10, "minPrepMin": 20, "pickupTimeoutMin": 45, "asapPrepMin": 8}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settings.storeName").value("MOS Riverside"))
                .andExpect(jsonPath("$.settings.minPrepMin").value(20))
                .andExpect(jsonPath("$.settings.pickupTimeoutMin").value(45));
        // the app sees it without signing in
        mvc.perform(get("/api/app/store")).andExpect(jsonPath("$.settings.address").value("Sisowath Quay"));
    }

    @Test
    void adminSetsWeeklyHoursAndClosedDays() throws Exception {   // FR-37
        mvc.perform(putAs(admin, "/api/admin/store/hours", week("{\"dayOfWeek\": 0, \"isClosed\": true}")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hours[0].isClosed").value(true))
                .andExpect(jsonPath("$.hours[0].openTime").isEmpty())
                .andExpect(jsonPath("$.hours[1].openTime").value("08:00:00"));
    }

    @Test
    void openingHoursComeBackFromTheDatabaseUnshifted() throws Exception {
        // Seeded 07:00-21:00. A JVM outside UTC once read these back as 14:00-04:00 (see UtcTimeZone).
        mvc.perform(get("/api/app/store"))
                .andExpect(jsonPath("$.hours[4].openTime").value("07:00:00"))
                .andExpect(jsonPath("$.hours[4].closeTime").value("21:00:00"))
                .andExpect(jsonPath("$.isOpenNow").value(true));   // Thursday 10:00 in Phnom Penh
    }

    @Test
    void closingBeforeOpeningIsRefused() throws Exception {
        mvc.perform(putAs(admin, "/api/admin/store/hours",
                        week("{\"dayOfWeek\": 0, \"openTime\": \"18:00\", \"closeTime\": \"09:00\"}")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("bad_hours"));
    }

    @Test
    void staffPauseOnlineOrdersButCannotChangeSettings() throws Exception {   // FR-41, SA 1.5
        mvc.perform(putAs(staff, "/api/admin/store/online-ordering", "{\"open\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.settings.onlineOrderingOpen").value(false));
        mvc.perform(get("/api/app/store")).andExpect(jsonPath("$.settings.onlineOrderingOpen").value(false));
        mvc.perform(putAs(staff, "/api/admin/store/settings", """
                        {"storeName": "X", "address": "Y", "phone": "1", "slotIntervalMin": 10, "minPrepMin": 0,
                         "pickupTimeoutMin": 30, "asapPrepMin": 5}"""))
                .andExpect(status().isForbidden());
        mvc.perform(putAs(staff, "/api/admin/store/hours", week("{\"dayOfWeek\": 0, \"isClosed\": true}")))
                .andExpect(status().isForbidden());
    }
}
