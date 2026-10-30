package mos.management.dashboard.web.admin;

import jakarta.validation.Valid;
import mos.management.dashboard.dto.AdminOrderDtos.PageView;
import mos.management.dashboard.dto.AdminOrderDtos.QueueView;
import mos.management.dashboard.dto.OrderDtos.OrderView;
import mos.management.dashboard.dto.OrderDtos.RejectRequest;
import mos.management.dashboard.dto.OrderDtos.WalkInRequest;
import mos.management.dashboard.entity.OrderSource;
import mos.management.dashboard.entity.OrderStatus;
import mos.management.dashboard.service.auth.CurrentUser;
import mos.management.dashboard.service.order.AdminOrderService;
import mos.management.dashboard.service.order.AdminOrderService.Filters;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** Daily order work for staff and admins (SA 1.5). */
@RestController
@RequestMapping("/api/admin")
public class AdminOrderController {

    private final AdminOrderService orders;
    private final CurrentUser currentUser;

    public AdminOrderController(AdminOrderService orders, CurrentUser currentUser) {
        this.orders = orders;
        this.currentUser = currentUser;
    }

    /** Polled every few seconds by the queue page (FR-19, NFR-02). */
    @GetMapping("/orders/queue")
    public QueueView queue() {
        return orders.queue();
    }

    @GetMapping("/orders")
    public PageView<OrderView> search(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                      @RequestParam(required = false) String status,
                                      @RequestParam(required = false) String source,
                                      @RequestParam(required = false) String q,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        return orders.search(new Filters(from, to,
                status == null || status.isBlank() ? null : OrderStatus.from(status),
                source == null || source.isBlank() ? null : OrderSource.from(source), q), page, size);
    }

    @GetMapping("/orders/{id}")
    public OrderView order(@PathVariable long id) {
        return OrderView.of(orders.order(id));
    }

    @PostMapping("/orders/{id}/advance")
    public OrderView advance(@PathVariable long id) {
        return OrderView.of(orders.advance(id, currentUser.id()));
    }

    @PostMapping("/orders/{id}/reject")
    public OrderView reject(@PathVariable long id, @Valid @RequestBody RejectRequest body) {
        return OrderView.of(orders.reject(id, currentUser.id(), body.reason()));
    }

    @PostMapping("/payments/{id}/refunded")
    public OrderView refunded(@PathVariable long id) {
        return OrderView.of(orders.markRefunded(id));
    }

    @PostMapping("/orders/walk-in")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderView walkIn(@Valid @RequestBody WalkInRequest body) {
        return OrderView.of(orders.walkIn(currentUser.id(), body));
    }
}
