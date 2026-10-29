package mos.management.dashboard.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** orders. Status changes go through {@link #moveTo}, which enforces BR-08. */
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Long id;

    private String pickupCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by")
    private User handledBy;

    @Convert(converter = OrderSource.Jpa.class)
    private OrderSource source;

    @Convert(converter = OrderStatus.Jpa.class)
    private OrderStatus status;

    @Convert(converter = PickupType.Jpa.class)
    private PickupType pickupType;

    private Instant pickupTime;
    private String note;
    private BigDecimal totalAmount;
    private String rejectReason;
    private Instant placedAt;
    private Instant confirmedAt;
    private Instant preparingAt;
    private Instant readyAt;
    private Instant completedAt;
    private Instant endedAt;
    private Instant createdAt;
    private Instant updatedAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    @OrderBy("id ASC")
    private List<Payment> payments = new ArrayList<>();

    protected Order() {
    }

    public Order(OrderSource source, OrderStatus status, PickupType pickupType, Instant pickupTime,
                 String note, User customer, Instant now) {
        this.source = source;
        this.status = status;
        this.pickupType = pickupType;
        this.pickupTime = pickupTime;
        this.note = note;
        this.customer = customer;
        this.totalAmount = BigDecimal.ZERO;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void addItem(OrderItem item) {
        items.add(item);
        totalAmount = items.stream().map(OrderItem::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public void addPayment(Payment payment) {
        payments.add(payment);
    }

    /**
     * BR-08: moves the order and stamps the matching time. Only forward
     * moves, and early endings from the states SA allows, are accepted.
     */
    public void moveTo(OrderStatus target, Instant now) {
        if (!canMoveTo(target)) {
            throw new IllegalStateException("Order " + id + " cannot go from " + status.dbValue() + " to " + target.dbValue());
        }
        status = target;
        updatedAt = now;
        switch (target) {
            case PLACED -> placedAt = now;
            case CONFIRMED -> confirmedAt = now;
            case PREPARING -> preparingAt = now;
            case READY -> readyAt = now;
            case COMPLETED -> completedAt = now;
            case CANCELLED, REJECTED, ABANDONED -> endedAt = now;
            default -> { }
        }
    }

    public boolean canMoveTo(OrderStatus target) {
        return switch (target) {
            case PLACED, ABANDONED -> status == OrderStatus.PENDING_PAYMENT;
            case CANCELLED, REJECTED -> status == OrderStatus.PLACED;   // BR-08, BR-09
            default -> status.next() == target;
        };
    }

    /** The payment that went through (it may since be refunded). */
    public Optional<Payment> paidPayment() {
        return payments.reversed().stream()
                .filter(p -> p.getStatus() == PaymentStatus.PAID
                        || p.getStatus() == PaymentStatus.REFUND_PENDING
                        || p.getStatus() == PaymentStatus.REFUNDED)
                .findFirst();
    }

    public int drinkCount() {
        return items.stream().mapToInt(OrderItem::getQuantity).sum();
    }

    public Long getId() { return id; }
    public String getPickupCode() { return pickupCode; }
    public void setPickupCode(String pickupCode) { this.pickupCode = pickupCode; }
    public User getCustomer() { return customer; }
    public User getHandledBy() { return handledBy; }
    public void setHandledBy(User handledBy) { this.handledBy = handledBy; }
    public OrderSource getSource() { return source; }
    public OrderStatus getStatus() { return status; }
    public PickupType getPickupType() { return pickupType; }
    public Instant getPickupTime() { return pickupTime; }
    public String getNote() { return note; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public String getRejectReason() { return rejectReason; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }
    public Instant getPlacedAt() { return placedAt; }
    public Instant getConfirmedAt() { return confirmedAt; }
    public Instant getPreparingAt() { return preparingAt; }
    public Instant getReadyAt() { return readyAt; }
    public Instant getCompletedAt() { return completedAt; }
    public Instant getEndedAt() { return endedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public List<OrderItem> getItems() { return items; }
    public List<Payment> getPayments() { return payments; }
}
