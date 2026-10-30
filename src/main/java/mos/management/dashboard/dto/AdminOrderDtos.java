package mos.management.dashboard.dto;

import mos.management.dashboard.dto.OrderDtos.OrderView;
import mos.management.dashboard.entity.OrderStatus;

import java.time.Instant;
import java.util.List;

/** Dashboard views of orders (FR-19 to FR-24, FR-32). */
public final class AdminOrderDtos {

    private AdminOrderDtos() {
    }

    /**
     * One order in the staff queue. {@code nextStatus} is what the one-tap
     * button does (NFR-04); {@code overdue} marks an order left in Ready
     * longer than the pickup timeout (BR-12).
     */
    public record QueueItem(OrderView order, OrderStatus nextStatus, Instant sortTime, boolean overdue) {
    }

    /** {@code serverTime} lets the dashboard show "3 min ago" with the server's clock. */
    public record QueueView(List<QueueItem> orders, Instant serverTime, boolean onlineOrderingOpen) {
    }

    public record PageView<T>(List<T> items, int page, int size, long total) {
    }
}
