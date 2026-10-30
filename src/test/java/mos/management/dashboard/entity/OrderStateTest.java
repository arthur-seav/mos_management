package mos.management.dashboard.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** BR-08: orders only move forward, and end early only from the states SA allows. */
class OrderStateTest {

    static final Instant T = Instant.parse("2026-10-29T03:00:00Z");

    static Order at(OrderStatus status) {
        Order o = new Order(OrderSource.ONLINE, OrderStatus.PENDING_PAYMENT, PickupType.ASAP, null, null, null, T);
        OrderStatus[] path = {OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY,
                OrderStatus.COMPLETED};
        for (OrderStatus s : path) {
            if (o.getStatus() == status) break;
            o.moveTo(s, T);
        }
        return o;
    }

    @Test
    void onlineOrdersWalkTheWholePathAndStampEachStep() {
        Order o = at(OrderStatus.COMPLETED);
        assertThat(o.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(o.getPlacedAt()).isNotNull();
        assertThat(o.getConfirmedAt()).isNotNull();
        assertThat(o.getReadyAt()).isNotNull();
        assertThat(o.getCompletedAt()).isNotNull();
    }

    @Test
    void cannotSkipOrGoBack() {
        assertThatThrownBy(() -> at(OrderStatus.PLACED).moveTo(OrderStatus.PREPARING, T))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> at(OrderStatus.READY).moveTo(OrderStatus.PREPARING, T))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void cancelAndRejectOnlyWhilePlaced() {   // BR-08, BR-09, TC-26
        assertThat(at(OrderStatus.PLACED).canMoveTo(OrderStatus.CANCELLED)).isTrue();
        assertThat(at(OrderStatus.PLACED).canMoveTo(OrderStatus.REJECTED)).isTrue();
        for (OrderStatus later : new OrderStatus[]{OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY}) {
            assertThat(at(later).canMoveTo(OrderStatus.CANCELLED)).as("cancel from " + later).isFalse();
            assertThat(at(later).canMoveTo(OrderStatus.REJECTED)).as("reject from " + later).isFalse();
        }
    }

    @Test
    void abandonedOnlyBeforePayment() {
        assertThat(at(OrderStatus.PENDING_PAYMENT).canMoveTo(OrderStatus.ABANDONED)).isTrue();
        assertThat(at(OrderStatus.PLACED).canMoveTo(OrderStatus.ABANDONED)).isFalse();
    }
}
