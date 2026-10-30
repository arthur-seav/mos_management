package mos.management.dashboard.web;

import mos.management.dashboard.entity.User;
import mos.management.dashboard.support.ApiTest;
import mos.management.dashboard.support.MenuFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Duration;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Staff order work. Clock: Thu 29 Oct 2026 10:00 Phnom Penh (03:00 UTC). */
class AdminOrderApiTest extends ApiTest {

    @Autowired
    MenuFixture menu;

    User customer;
    User staff;
    User admin;

    @BeforeEach
    void setUp() {
        menu.build();
        customer = customer();
        staff = staff();
        admin = admin();
    }

    String mochaLine(int qty) {
        return "{\"productId\": %d, \"optionIds\": [%d], \"quantity\": %d}".formatted(menu.mocha.getId(), menu.medium.getId(), qty);
    }

    long id(String json, String field) {
        return Long.parseLong(json.replaceAll("^\\{\"" + field + "\":(\\d+).*", "$1"));
    }

    /** An online order paid by KHQR: Placed, $4.10 (Mocha 3.60 + Medium 0.50). */
    long paidOnlineOrder(String pickup) throws Exception {
        String order = mvc.perform(postAs(customer, "/api/app/orders", "{" + pickup + ", \"lines\": [" + mochaLine(1) + "]}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long orderId = id(order, "id");
        String charge = mvc.perform(postAs(customer, "/api/app/orders/" + orderId + "/payments/khqr", "{}"))
                .andReturn().getResponse().getContentAsString();
        clock.advance(Duration.ofSeconds(6));
        mvc.perform(getAs(customer, "/api/app/payments/" + id(charge, "paymentId")));
        return orderId;
    }

    long paidOnlineOrder() throws Exception {
        return paidOnlineOrder("\"pickupType\": \"asap\"");
    }

    @Test
    void unpaidOrdersNeverReachTheQueue() throws Exception {   // SA 3.3, TC-22
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": [" + mochaLine(1) + "]}"));
        mvc.perform(getAs(staff, "/api/admin/orders/queue")).andExpect(jsonPath("$.orders", hasSize(0)));
    }

    @Test
    void paidOrderShowsUpInTheQueueWithItsCode() throws Exception {   // FR-19, TC-21
        long orderId = paidOnlineOrder();
        mvc.perform(getAs(staff, "/api/admin/orders/queue"))
                .andExpect(jsonPath("$.orders", hasSize(1)))
                .andExpect(jsonPath("$.orders[0].order.id").value(orderId))
                .andExpect(jsonPath("$.orders[0].order.pickupCode").value("A001"))
                .andExpect(jsonPath("$.orders[0].order.source").value("online"))
                .andExpect(jsonPath("$.orders[0].order.customer.name").value("Test customer"))
                .andExpect(jsonPath("$.orders[0].nextStatus").value("confirmed"));
    }

    @Test
    void oneTapMovesTheOrderAlongAndTheCustomerSeesIt() throws Exception {   // FR-21, NFR-04, TC-24
        long orderId = paidOnlineOrder();
        for (String expected : new String[]{"confirmed", "preparing", "ready", "completed"}) {
            mvc.perform(postAs(staff, "/api/admin/orders/" + orderId + "/advance", "{}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(expected));
            mvc.perform(getAs(customer, "/api/app/orders/" + orderId)).andExpect(jsonPath("$.status").value(expected));
        }
        mvc.perform(getAs(customer, "/api/app/orders/" + orderId))
                .andExpect(jsonPath("$.handledBy.name").value("Test staff"))
                .andExpect(jsonPath("$.readyAt").isNotEmpty());
        mvc.perform(postAs(staff, "/api/admin/orders/" + orderId + "/advance", "{}")).andExpect(status().isConflict());
        mvc.perform(getAs(staff, "/api/admin/orders/queue")).andExpect(jsonPath("$.orders", hasSize(0)));
    }

    @Test
    void rejectingAPaidOrderNeedsAReasonAndStartsARefund() throws Exception {   // TC-27, BR-10, FR-38
        long orderId = paidOnlineOrder();
        mvc.perform(postAs(staff, "/api/admin/orders/" + orderId + "/reject", "{\"reason\": \"\"}"))
                .andExpect(status().isBadRequest());
        String rejected = mvc.perform(postAs(staff, "/api/admin/orders/" + orderId + "/reject", "{\"reason\": \"Sold out\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("rejected"))
                .andExpect(jsonPath("$.payments[0].status").value("refund_pending"))
                .andReturn().getResponse().getContentAsString();
        mvc.perform(getAs(customer, "/api/app/orders/" + orderId))
                .andExpect(jsonPath("$.status").value("rejected"))
                .andExpect(jsonPath("$.rejectReason").value("Sold out"));
        long paymentId = Long.parseLong(rejected.replaceAll(".*\"payments\":\\[\\{\"id\":(\\d+).*", "$1"));
        mvc.perform(postAs(staff, "/api/admin/payments/" + paymentId + "/refunded", "{}"))
                .andExpect(jsonPath("$.payments[0].status").value("refunded"));
    }

    @Test
    void onlyNewOrdersCanBeRejected() throws Exception {
        long orderId = paidOnlineOrder();
        mvc.perform(postAs(staff, "/api/admin/orders/" + orderId + "/advance", "{}"));
        mvc.perform(postAs(staff, "/api/admin/orders/" + orderId + "/reject", "{\"reason\": \"Sold out\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("cannot_reject"));
    }

    @Test
    void walkInStartsConfirmedAndPaidInCash() throws Exception {   // FR-23, FR-39, BR-08, BR-13
        mvc.perform(postAs(staff, "/api/admin/orders/walk-in", "{\"lines\": [" + mochaLine(2) + "], \"cashReceived\": 5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("not_enough_cash"));   // $8.20 > $5
        mvc.perform(postAs(staff, "/api/admin/orders/walk-in", "{\"lines\": [" + mochaLine(2) + "], \"cashReceived\": 10}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("walk_in"))
                .andExpect(jsonPath("$.status").value("confirmed"))
                .andExpect(jsonPath("$.customer").isEmpty())
                .andExpect(jsonPath("$.totalAmount").value(8.20))
                .andExpect(jsonPath("$.pickupCode").value("A001"))
                .andExpect(jsonPath("$.payments[0].method").value("cash"))
                .andExpect(jsonPath("$.payments[0].status").value("paid"))
                .andExpect(jsonPath("$.payments[0].recordedBy").value("Test staff"));
    }

    @Test
    void walkInsStillWorkWhileOnlineOrderingIsPaused() throws Exception {   // FR-41 is about the app, BR-14
        long online = paidOnlineOrder();
        jdbc.update("update store_settings set online_ordering_open = false");
        mvc.perform(postAs(staff, "/api/admin/orders/walk-in", "{\"lines\": [" + mochaLine(1) + "]}"))
                .andExpect(status().isCreated());
        mvc.perform(postAs(staff, "/api/admin/orders/" + online + "/advance", "{}"))
                .andExpect(jsonPath("$.status").value("confirmed"));   // already placed orders carry on
    }

    @Test
    void oneQueueSortedByOrderTimeOrPickupTime() throws Exception {   // FR-24, BR-11
        long asap = paidOnlineOrder();                                                   // placed 10:00:06
        long scheduled = paidOnlineOrder("\"pickupType\": \"scheduled\", \"pickupTime\": \"2026-10-29T03:40:00Z\"");   // 10:40
        clock.advance(Duration.ofMinutes(1));
        String walkIn = mvc.perform(postAs(staff, "/api/admin/orders/walk-in", "{\"lines\": [" + mochaLine(1) + "]}"))
                .andReturn().getResponse().getContentAsString();                         // 10:01
        mvc.perform(getAs(staff, "/api/admin/orders/queue"))
                .andExpect(jsonPath("$.orders[*].order.id").value(contains((int) asap, (int) id(walkIn, "id"), (int) scheduled)))
                .andExpect(jsonPath("$.orders[*].order.source").value(contains("online", "walk_in", "online")));
    }

    @Test
    void readyTooLongIsFlagged() throws Exception {   // BR-12
        long orderId = paidOnlineOrder();
        for (int i = 0; i < 3; i++) mvc.perform(postAs(staff, "/api/admin/orders/" + orderId + "/advance", "{}"));
        clock.advance(Duration.ofMinutes(30));
        mvc.perform(getAs(staff, "/api/admin/orders/queue")).andExpect(jsonPath("$.orders[0].overdue").value(false));
        clock.advance(Duration.ofMinutes(1));
        mvc.perform(getAs(staff, "/api/admin/orders/queue")).andExpect(jsonPath("$.orders[0].overdue").value(true));
    }

    @Test
    void recordsSearchByDateStatusSourceAndText() throws Exception {   // FR-32, FR-42
        long online = paidOnlineOrder();
        mvc.perform(postAs(staff, "/api/admin/orders/walk-in", "{\"lines\": [" + mochaLine(1) + "]}"));
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": [" + mochaLine(1) + "]}"));   // unpaid

        mvc.perform(getAs(staff, "/api/admin/orders")).andExpect(jsonPath("$.total").value(2));
        mvc.perform(getAs(staff, "/api/admin/orders?source=walk_in")).andExpect(jsonPath("$.items[*].source").value(contains("walk_in")));
        mvc.perform(getAs(staff, "/api/admin/orders?status=pending_payment")).andExpect(jsonPath("$.total").value(1));
        mvc.perform(getAs(staff, "/api/admin/orders?q=012345")).andExpect(jsonPath("$.items[*].id").value(contains((int) online)));
        mvc.perform(getAs(staff, "/api/admin/orders?q=a001")).andExpect(jsonPath("$.items[*].id").value(contains((int) online)));
        mvc.perform(getAs(staff, "/api/admin/orders?from=2026-10-29&to=2026-10-29")).andExpect(jsonPath("$.total").value(2));
        mvc.perform(getAs(staff, "/api/admin/orders?from=2026-10-30")).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void customersCannotUseTheStaffOrderApi() throws Exception {
        mvc.perform(getAs(customer, "/api/admin/orders/queue")).andExpect(status().isForbidden());
    }
}
