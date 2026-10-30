package mos.management.dashboard.service.order;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import mos.management.dashboard.dto.AdminOrderDtos.PageView;
import mos.management.dashboard.dto.AdminOrderDtos.QueueItem;
import mos.management.dashboard.dto.AdminOrderDtos.QueueView;
import mos.management.dashboard.dto.OrderDtos.OrderView;
import mos.management.dashboard.dto.OrderDtos.WalkInRequest;
import mos.management.dashboard.entity.Order;
import mos.management.dashboard.entity.OrderSource;
import mos.management.dashboard.entity.OrderStatus;
import mos.management.dashboard.entity.Payment;
import mos.management.dashboard.entity.PaymentMethod;
import mos.management.dashboard.entity.PaymentStatus;
import mos.management.dashboard.entity.PickupType;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.OrderRepository;
import mos.management.dashboard.repository.PaymentRepository;
import mos.management.dashboard.repository.UserRepository;
import mos.management.dashboard.service.store.StoreService;
import mos.management.dashboard.util.Text;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;

/**
 * The staff side of orders: one queue for online and walk-in orders
 * (FR-19, FR-24, BR-11), confirm/reject (FR-20, BR-10), one-tap status
 * updates (FR-21, NFR-04), walk-in orders paid at the counter (FR-23,
 * FR-39, BR-13), refunds (FR-33) and the order records (FR-32, FR-42).
 */
@Service
@Transactional
public class AdminOrderService {

    private static final EnumSet<OrderStatus> QUEUE =
            EnumSet.of(OrderStatus.PLACED, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY);

    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final UserRepository users;
    private final PricingService pricing;
    private final StoreService store;
    private final Clock clock;

    public AdminOrderService(OrderRepository orders, PaymentRepository payments, UserRepository users,
                             PricingService pricing, StoreService store, Clock clock) {
        this.orders = orders;
        this.payments = payments;
        this.users = users;
        this.pricing = pricing;
        this.store = store;
        this.clock = clock;
    }

    /** BR-11: by order time; scheduled orders by their pickup time. */
    @Transactional(readOnly = true)
    public QueueView queue() {
        Instant now = clock.instant();
        Duration timeout = Duration.ofMinutes(store.current().getPickupTimeoutMin());
        List<QueueItem> items = orders.findByStatusIn(QUEUE).stream()
                .map(OrderService::loaded)
                .map(o -> new QueueItem(OrderView.of(o), o.getStatus().next(), sortTime(o),
                        o.getStatus() == OrderStatus.READY && o.getReadyAt() != null
                                && now.isAfter(o.getReadyAt().plus(timeout))))
                .sorted(Comparator.comparing(QueueItem::sortTime).thenComparing(i -> i.order().id()))
                .toList();
        return new QueueView(items, now, store.current().isOnlineOrderingOpen());
    }

    static Instant sortTime(Order o) {
        if (o.getPickupType() == PickupType.SCHEDULED && o.getPickupTime() != null) return o.getPickupTime();
        return o.getPlacedAt() != null ? o.getPlacedAt() : o.getCreatedAt();
    }

    @Transactional(readOnly = true)
    public Order order(long id) {
        return orders.findById(id).map(OrderService::loaded).orElseThrow(() -> ApiException.notFound("Order"));
    }

    /** The one-tap button: Placed -> Confirmed -> Preparing -> Ready -> Completed (FR-20, FR-21). */
    public Order advance(long orderId, long staffId) {
        Order order = order(orderId);
        OrderStatus next = order.getStatus().next();
        if (next == null) throw ApiException.conflict("invalid_state", "This order is already finished.");
        if (order.getStatus() == OrderStatus.PLACED) order.setHandledBy(staff(staffId));   // who confirmed it
        order.moveTo(next, clock.instant());
        return order;
    }

    /** BR-10, TC-27: only while Placed, with a reason; a paid order's payment goes to refund_pending. */
    public Order reject(long orderId, long staffId, String reason) {
        Order order = order(orderId);
        if (order.getStatus() != OrderStatus.PLACED) {
            throw ApiException.conflict("cannot_reject", "Only new orders can be rejected. This one is " + order.getStatus().dbValue() + ".");
        }
        String r = Text.blankToNull(reason);
        if (r == null) throw ApiException.badRequest("reason_required", "Pick a reason.");
        order.setRejectReason(r);
        order.setHandledBy(staff(staffId));
        order.moveTo(OrderStatus.REJECTED, clock.instant());
        order.paidPayment().filter(p -> p.getStatus() == PaymentStatus.PAID).ifPresent(Payment::startRefund);
        return order;
    }

    /** 7.4 "Mark refund order": the money has been given back. */
    public Order markRefunded(long paymentId) {
        Payment payment = payments.findById(paymentId).orElseThrow(() -> ApiException.notFound("Payment"));
        if (payment.getStatus() != PaymentStatus.REFUND_PENDING) {
            throw ApiException.conflict("not_refund_pending", "This payment is not waiting for a refund.");
        }
        payment.markRefunded();
        return OrderService.loaded(payment.getOrder());
    }

    /**
     * FR-23, FR-39, BR-08, BR-13: created by staff, starts at Confirmed,
     * paid in cash at the counter. Prices are worked out like online orders.
     * Pausing online orders does not stop walk-ins (FR-41 is about the app).
     */
    public Order walkIn(long staffId, WalkInRequest req) {
        User staff = staff(staffId);
        Instant now = clock.instant();
        Order order = new Order(OrderSource.WALK_IN, OrderStatus.CONFIRMED, PickupType.ASAP, null,
                Text.blankToNull(req.note()), null, now);
        order.startAsWalkIn(now);
        order.setHandledBy(staff);
        pricing.addLines(order, req.lines());
        if (req.cashReceived() != null && req.cashReceived().compareTo(order.getTotalAmount()) < 0) {
            throw ApiException.badRequest("not_enough_cash", "The cash received is less than the total.");
        }
        orders.saveAndFlush(order);
        order.setPickupCode(OrderService.pickupCode(order));
        Payment cash = new Payment(order, PaymentMethod.CASH, order.getTotalAmount(), now);
        cash.setRecordedBy(staff);
        cash.markPaid(null, now);
        order.addPayment(cash);
        payments.save(cash);
        return order;
    }

    public record Filters(LocalDate from, LocalDate to, OrderStatus status, OrderSource source, String q) {
    }

    /** FR-32, FR-42: newest first; unpaid online orders only when asked for by status. */
    @Transactional(readOnly = true)
    public PageView<OrderView> search(Filters f, int page, int size) {
        ZoneId zone = store.zone();
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            if (f.from() != null) where.add(cb.greaterThanOrEqualTo(root.get("createdAt"), f.from().atStartOfDay(zone).toInstant()));
            if (f.to() != null) where.add(cb.lessThan(root.get("createdAt"), f.to().plusDays(1).atStartOfDay(zone).toInstant()));
            if (f.status() != null) where.add(cb.equal(root.get("status"), f.status()));
            else where.add(cb.notEqual(root.get("status"), OrderStatus.PENDING_PAYMENT));
            if (f.source() != null) where.add(cb.equal(root.get("source"), f.source()));
            String q = Text.blankToNull(f.q());
            if (q != null) {
                String like = "%" + q.toLowerCase(Locale.ROOT) + "%";
                Join<Order, User> c = root.join("customer", JoinType.LEFT);
                where.add(cb.or(
                        cb.like(cb.lower(root.get("pickupCode")), like),
                        cb.like(cb.lower(cb.concat(cb.concat(c.get("firstName"), " "), c.get("lastName"))), like),
                        cb.like(cb.lower(cb.coalesce(c.get("email"), "")), like),
                        cb.like(cb.coalesce(c.get("phone"), ""), like)));
            }
            return cb.and(where.toArray(Predicate[]::new));
        };
        int s = Math.clamp(size, 1, 100);
        Page<Order> result = orders.findAll(spec, PageRequest.of(Math.max(page, 0), s,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id"))));
        return new PageView<>(result.getContent().stream().map(OrderService::loaded).map(OrderView::of).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements());
    }

    private User staff(long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Account"));
    }
}
