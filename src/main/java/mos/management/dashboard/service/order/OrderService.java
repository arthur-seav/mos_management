package mos.management.dashboard.service.order;

import mos.management.dashboard.dto.OrderDtos.OrderRequest;
import mos.management.dashboard.entity.Order;
import mos.management.dashboard.entity.OrderSource;
import mos.management.dashboard.entity.OrderStatus;
import mos.management.dashboard.entity.Payment;
import mos.management.dashboard.entity.PaymentStatus;
import mos.management.dashboard.entity.PickupType;
import mos.management.dashboard.entity.User;
import mos.management.dashboard.entity.UserRole;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.OrderRepository;
import mos.management.dashboard.repository.UserRepository;
import mos.management.dashboard.service.store.PickupRules;
import mos.management.dashboard.service.store.StoreService;
import mos.management.dashboard.util.Text;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * The customer side of orders (FR-11 to FR-18): place, pay, track, cancel,
 * history. Status changes go through Order.moveTo (BR-08).
 */
@Service
@Transactional
public class OrderService {

    /** An unpaid online order is abandoned after this (BR-08 "Abandoned"). */
    public static final Duration ABANDON_AFTER = Duration.ofMinutes(30);

    private final OrderRepository orders;
    private final UserRepository users;
    private final PricingService pricing;
    private final StoreService store;
    private final Clock clock;

    public OrderService(OrderRepository orders, UserRepository users, PricingService pricing, StoreService store,
                        Clock clock) {
        this.orders = orders;
        this.users = users;
        this.pricing = pricing;
        this.store = store;
        this.clock = clock;
    }

    /** FR-12: the order waits in pending_payment; staff only see it once paid (SA 3.3). */
    public Order createOnline(long customerId, OrderRequest req) {
        User customer = users.findById(customerId)
                .filter(u -> u.getRole() == UserRole.CUSTOMER)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "not_signed_in", "Sign in to order."));   // BR-06
        if (!store.current().isOnlineOrderingOpen()) {
            throw new ApiException(HttpStatus.CONFLICT, "ordering_paused",
                    "Online ordering is paused right now. Please order at the counter.");   // FR-41, TC-20
        }
        Instant now = clock.instant();
        PickupRules rules = store.rules();
        Instant pickupTime = null;
        if (req.pickupType() == PickupType.ASAP) {
            if (!rules.canPickUpAsap()) {
                throw new ApiException(HttpStatus.CONFLICT, "slot_unavailable", "The store is closed now. Pick a later time.");
            }
        } else {
            pickupTime = req.pickupTime();
            if (pickupTime == null || !rules.allows(pickupTime)) {
                throw new ApiException(HttpStatus.CONFLICT, "slot_unavailable",
                        "That pickup time is no longer available. Pick another.");   // BR-07
            }
        }
        Order order = new Order(OrderSource.ONLINE, OrderStatus.PENDING_PAYMENT, req.pickupType(), pickupTime,
                Text.blankToNull(req.note()), customer, now);
        pricing.addLines(order, req.lines());   // NFR-07, BR-05
        return orders.save(order);
    }

    @Transactional(readOnly = true)
    public Order customerOrder(long customerId, long orderId) {
        return orders.findById(orderId)
                .filter(o -> o.getCustomer() != null && o.getCustomer().getId() == customerId)
                .map(OrderService::loaded)
                .orElseThrow(() -> ApiException.notFound("Order"));
    }

    /** FR-18: newest first; orders still waiting for payment are left out. */
    @Transactional(readOnly = true)
    public List<Order> history(long customerId) {
        return orders.findByCustomerIdAndStatusNotOrderByCreatedAtDesc(customerId, OrderStatus.PENDING_PAYMENT)
                .stream().map(OrderService::loaded).toList();
    }

    /** BR-09, TC-25, TC-26: only while Placed; a paid payment becomes refund_pending. */
    public Order cancel(long customerId, long orderId) {
        Order order = customerOrder(customerId, orderId);
        if (order.getStatus() != OrderStatus.PLACED) {
            throw ApiException.conflict("cannot_cancel", "The store has already confirmed this order, so it can't be cancelled.");
        }
        order.moveTo(OrderStatus.CANCELLED, clock.instant());
        order.paidPayment().filter(p -> p.getStatus() == PaymentStatus.PAID).ifPresent(Payment::startRefund);
        return order;
    }

    /** "A001", "A1024": unique because it is the order id. */
    static String pickupCode(Order order) {
        return "A" + String.format("%03d", order.getId());
    }

    /** BR-08 "Abandoned": the customer left without paying. */
    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void abandonUnpaid() {
        Instant now = clock.instant();
        for (Order o : orders.findByStatusAndCreatedAtBefore(OrderStatus.PENDING_PAYMENT, now.minus(ABANDON_AFTER))) {
            o.getPayments().stream().filter(p -> p.getStatus() == PaymentStatus.PENDING)
                    .forEach(p -> p.markFailed("The order was not paid in time."));
            o.moveTo(OrderStatus.ABANDONED, now);
        }
    }

    /** Touches lazy collections inside the transaction (open-in-view is off). */
    static Order loaded(Order o) {
        o.getItems().forEach(i -> i.getOptions().size());
        o.getPayments().size();
        if (o.getCustomer() != null) o.getCustomer().getFirstName();
        if (o.getHandledBy() != null) o.getHandledBy().getFirstName();
        return o;
    }
}
