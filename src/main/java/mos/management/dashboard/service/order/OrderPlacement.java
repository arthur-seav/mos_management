package mos.management.dashboard.service.order;

import mos.management.dashboard.entity.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;

/** Moves a paid order to Placed and gives it its pickup code (FR-14). */
@Component
public class OrderPlacement {

    public void place(Order order, Instant now) {
        order.moveTo(mos.management.dashboard.entity.OrderStatus.PLACED, now);
        order.setPickupCode(OrderService.pickupCode(order));
    }
}
