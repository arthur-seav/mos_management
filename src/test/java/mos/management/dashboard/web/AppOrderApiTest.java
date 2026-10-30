package mos.management.dashboard.web;

import mos.management.dashboard.entity.OrderStatus;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.repository.OrderRepository;
import mos.management.dashboard.service.order.OrderService;
import mos.management.dashboard.support.ApiTest;
import mos.management.dashboard.support.MenuFixture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The customer app's ordering API. Clock: Thu 29 Oct 2026 10:00 in Phnom Penh; open 07:00-21:00. */
class AppOrderApiTest extends ApiTest {

    @Autowired
    MenuFixture menu;
    @Autowired
    OrderRepository orderRepository;
    @Autowired
    OrderService orderService;

    User customer;

    @BeforeEach
    void setUp() {
        menu.build();
        customer = customer();
    }

    String latteLine(int qty, long... options) {
        StringBuilder ids = new StringBuilder();
        for (long o : options) ids.append(ids.isEmpty() ? "" : ",").append(o);
        return "{\"productId\": %d, \"optionIds\": [%s], \"quantity\": %d}".formatted(menu.latte.getId(), ids, qty);
    }

    /** Large hot latte, regular sugar, oat milk. */
    String tc14Line() {
        return latteLine(2, menu.large.getId(), menu.hot.getId(), menu.regularSugar.getId(), menu.oatMilk.getId());
    }

    long placeAsap(String... lines) throws Exception {
        String body = mvc.perform(postAs(customer, "/api/app/orders",
                        "{\"pickupType\": \"asap\", \"lines\": [" + String.join(",", lines) + "]}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return Long.parseLong(body.replaceAll("^\\{\"id\":(\\d+).*", "$1"));
    }

    long payByKhqr(long orderId) throws Exception {
        String body = mvc.perform(postAs(customer, "/api/app/orders/" + orderId + "/payments/khqr", "{}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long paymentId = Long.parseLong(body.replaceAll("^\\{\"paymentId\":(\\d+).*", "$1"));
        clock.advance(Duration.ofSeconds(6));
        mvc.perform(getAs(customer, "/api/app/payments/" + paymentId)).andExpect(jsonPath("$.status").value("paid"));
        return paymentId;
    }

    @Test
    void theServerWorksOutThePriceFromTheMenu() throws Exception {   // TC-14, TC-23, BR-03
        // Latte $3.00 + Large $1.00 (its own price) + oat milk $0.60 = $4.60, x2 = $9.20.
        // The app sends no prices at all, so a changed total on the phone has no effect.
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"totalAmount\": 0.10, \"lines\": [" + tc14Line() + "]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("pending_payment"))
                .andExpect(jsonPath("$.totalAmount").value(9.20))
                .andExpect(jsonPath("$.items[0].unitPrice").value(4.60))
                .andExpect(jsonPath("$.items[0].optionNames").value(contains("Large", "Hot", "Regular sugar", "Oat milk")))
                .andExpect(jsonPath("$.pickupCode").isEmpty());
    }

    @Test
    void iceLevelOnlyCountsForIcedDrinks() throws Exception {   // BR-01
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": ["
                        + latteLine(1, menu.medium.getId(), menu.hot.getId(), menu.lessIce.getId(), menu.regularSugar.getId()) + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("invalid_options"));
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": ["
                        + latteLine(1, menu.medium.getId(), menu.iced.getId(), menu.regularSugar.getId()) + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Latte: Ice level is required."));
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": ["
                        + latteLine(1, menu.medium.getId(), menu.iced.getId(), menu.lessIce.getId(), menu.regularSugar.getId()) + "]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[0].optionNames").value(contains("Medium", "Iced", "Less ice", "Regular sugar")));
    }

    @Test
    void aRequiredGroupMustBeChosenAndAddOnsStopAtThree() throws Exception {   // TC-12, TC-13
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": ["
                        + latteLine(1, menu.hot.getId(), menu.regularSugar.getId()) + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Latte: Size is required."));
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": ["
                        + latteLine(1, menu.small.getId(), menu.hot.getId(), menu.regularSugar.getId(), menu.oatMilk.getId(),
                        menu.extraShot.getId(), menu.vanilla.getId(), menu.caramel.getId()) + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Latte: pick up to 3 in Add-ons."));
    }

    @Test
    void soldOutDrinksAreRefusedAndReported() throws Exception {   // BR-05, TC-09, TC-17
        menu.mocha.setAvailable(false);
        jdbc.update("update products set is_available = false where product_id = ?", menu.mocha.getId());
        mvc.perform(get("/api/app/menu")).andExpect(jsonPath("$.products[?(@.name == 'Mocha')].isAvailable").value(contains(false)));
        mvc.perform(postJson("/api/app/menu/unavailable", "{\"productIds\": [%d, %d]}".formatted(menu.latte.getId(), menu.mocha.getId())))
                .andExpect(jsonPath("$.productIds").value(contains(menu.mocha.getId().intValue())));
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": [{\"productId\": %d, \"optionIds\": [%d], \"quantity\": 1}]}"
                        .formatted(menu.mocha.getId(), menu.medium.getId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("drink_unavailable"));
    }

    @Test
    void pausedOnlineOrderingBlocksNewOrders() throws Exception {   // FR-41, TC-20
        jdbc.update("update store_settings set online_ordering_open = false");
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": [" + tc14Line() + "]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ordering_paused"));
    }

    @Test
    void scheduledPickupFollowsBr07() throws Exception {   // BR-07, TC-19
        // now 10:00 local; 10:20 is too soon (30 min), 20:01 is after close-60.
        String soon = "2026-10-29T03:20:00Z", late = "2026-10-29T13:01:00Z", ok = "2026-10-29T04:00:00Z";
        for (String t : new String[]{soon, late}) {
            mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"scheduled\", \"pickupTime\": \"" + t + "\", \"lines\": [" + tc14Line() + "]}"))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.code").value("slot_unavailable"));
        }
        mvc.perform(postAs(customer, "/api/app/orders", "{\"pickupType\": \"scheduled\", \"pickupTime\": \"" + ok + "\", \"lines\": [" + tc14Line() + "]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pickupTime").value(ok));
    }

    @Test
    void guestsCannotOrder() throws Exception {   // BR-06
        mvc.perform(postJson("/api/app/orders", "{\"pickupType\": \"asap\", \"lines\": [" + tc14Line() + "]}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void khqrPaymentPlacesTheOrderWithAPickupCode() throws Exception {   // TC-21, FR-14
        long orderId = placeAsap(tc14Line());
        String charge = mvc.perform(postAs(customer, "/api/app/orders/" + orderId + "/payments/khqr", "{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(9.20))
                .andExpect(jsonPath("$.qrData").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        long paymentId = Long.parseLong(charge.replaceAll("^\\{\"paymentId\":(\\d+).*", "$1"));
        mvc.perform(getAs(customer, "/api/app/payments/" + paymentId)).andExpect(jsonPath("$.status").value("pending"));
        clock.advance(Duration.ofSeconds(6));
        mvc.perform(getAs(customer, "/api/app/payments/" + paymentId)).andExpect(jsonPath("$.status").value("paid"));
        mvc.perform(getAs(customer, "/api/app/orders/" + orderId))
                .andExpect(jsonPath("$.status").value("placed"))
                .andExpect(jsonPath("$.pickupCode").value("A00" + orderId))
                .andExpect(jsonPath("$.placedAt").isNotEmpty());
    }

    @Test
    void declinedCardThenKhqrLeavesTwoPayments() throws Exception {   // TC-22
        String card = mvc.perform(postAs(customer, "/api/app/cards", """
                        {"number": "4000 0000 0000 0002", "holderName": "Dara Sok", "expiryMonth": 9, "expiryYear": 2030, "cvv": "123"}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.last4").value("0002"))
                .andExpect(jsonPath("$.maskedNumber").value("•••• •••• •••• 0002"))
                .andReturn().getResponse().getContentAsString();
        long cardId = Long.parseLong(card.replaceAll("^\\{\"id\":(\\d+).*", "$1"));
        long orderId = placeAsap(tc14Line());
        mvc.perform(postAs(customer, "/api/app/orders/" + orderId + "/payments/card", "{\"cardId\": " + cardId + "}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("failed"))
                .andExpect(jsonPath("$.failureReason").value("Your card was declined."));
        mvc.perform(getAs(customer, "/api/app/orders/" + orderId)).andExpect(jsonPath("$.status").value("pending_payment"));
        payByKhqr(orderId);
        mvc.perform(getAs(customer, "/api/app/orders/" + orderId))
                .andExpect(jsonPath("$.status").value("placed"))
                .andExpect(jsonPath("$.payments[*].status").value(contains("failed", "paid")));
        assertThat(jdbc.queryForObject("select gateway_token from saved_cards", String.class)).doesNotContain("4000000000000002");
    }

    @Test
    void aGoodCardPaysAtOnceAndABadNumberIsRefused() throws Exception {
        mvc.perform(postAs(customer, "/api/app/cards", """
                        {"number": "4242 4242 4242 4241", "expiryMonth": 9, "expiryYear": 2030, "cvv": "123"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("card_rejected"));
        String card = mvc.perform(postAs(customer, "/api/app/cards", """
                        {"number": "4242424242424242", "expiryMonth": 9, "expiryYear": 2030, "cvv": "123"}"""))
                .andReturn().getResponse().getContentAsString();
        long cardId = Long.parseLong(card.replaceAll("^\\{\"id\":(\\d+).*", "$1"));
        long orderId = placeAsap(tc14Line());
        mvc.perform(postAs(customer, "/api/app/orders/" + orderId + "/payments/card", "{\"cardId\": " + cardId + "}"))
                .andExpect(jsonPath("$.status").value("paid"));
        mvc.perform(getAs(customer, "/api/app/cards")).andExpect(jsonPath("$[*].brand").value(contains("Visa")));
    }

    @Test
    void cancelWhilePlacedStartsARefund() throws Exception {   // TC-25, BR-09
        long orderId = placeAsap(tc14Line());
        payByKhqr(orderId);
        mvc.perform(postAs(customer, "/api/app/orders/" + orderId + "/cancel", "{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("cancelled"))
                .andExpect(jsonPath("$.endedAt").isNotEmpty())
                .andExpect(jsonPath("$.payments[0].status").value("refund_pending"));
    }

    @Test
    void cannotCancelOnceConfirmed() throws Exception {   // TC-26
        long orderId = placeAsap(tc14Line());
        payByKhqr(orderId);
        jdbc.update("update orders set status = 'confirmed' where order_id = ?", orderId);
        mvc.perform(postAs(customer, "/api/app/orders/" + orderId + "/cancel", "{}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("cannot_cancel"));
    }

    @Test
    void historyHidesUnpaidOrdersAndOtherPeoplesOrders() throws Exception {   // FR-18
        long unpaid = placeAsap(tc14Line());
        long paid = placeAsap(tc14Line());
        payByKhqr(paid);
        mvc.perform(getAs(customer, "/api/app/orders"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(paid));
        User other = user(mos.management.dashboard.entity.UserRole.CUSTOMER, "other@example.com", "098765432");
        mvc.perform(getAs(other, "/api/app/orders/" + unpaid)).andExpect(status().isNotFound());
    }

    @Test
    void unpaidOrdersAreAbandonedAfterHalfAnHour() throws Exception {   // BR-08
        long orderId = placeAsap(tc14Line());
        clock.advance(Duration.ofMinutes(29));
        orderService.abandonUnpaid();
        assertThat(orderRepository.findById(orderId).orElseThrow().getStatus()).isEqualTo(OrderStatus.PENDING_PAYMENT);
        clock.advance(Duration.ofMinutes(2));
        orderService.abandonUnpaid();
        assertThat(orderRepository.findById(orderId).orElseThrow().getStatus()).isEqualTo(OrderStatus.ABANDONED);
    }

    @Test
    void pricesAreCopiedSoMenuChangesLeavePlacedOrdersAlone() throws Exception {   // BR-04
        long orderId = placeAsap(tc14Line());
        jdbc.update("update products set base_price = 9.99, name = 'Renamed' where product_id = ?", menu.latte.getId());
        mvc.perform(getAs(customer, "/api/app/orders/" + orderId))
                .andExpect(jsonPath("$.totalAmount").value(9.20))
                .andExpect(jsonPath("$.items[0].productName").value("Latte"));
    }
}
