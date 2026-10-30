package mos.management.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;

/** payments: one try at paying for an order (TC-22: failed, then paid). */
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "payment_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @Convert(converter = PaymentMethod.Jpa.class)
    private PaymentMethod method;

    private BigDecimal amount;

    @Convert(converter = PaymentStatus.Jpa.class)
    private PaymentStatus status;

    private String transactionRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recorded_by")
    private User recordedBy;

    private Instant paidAt;
    private Instant createdAt;

    /** Why it failed ("Your card was declined."). Not in SA. */
    private String failureReason;

    protected Payment() {
    }

    public Payment(Order order, PaymentMethod method, BigDecimal amount, Instant now) {
        this.order = order;
        this.method = method;
        this.amount = amount;
        this.status = PaymentStatus.PENDING;
        this.createdAt = now;
    }

    public void markPaid(String transactionRef, Instant now) {
        requireStatus(PaymentStatus.PENDING);
        this.status = PaymentStatus.PAID;
        this.transactionRef = transactionRef;
        this.paidAt = now;
    }

    public void markFailed(String reason) {
        requireStatus(PaymentStatus.PENDING);
        this.status = PaymentStatus.FAILED;
        this.failureReason = reason;
    }

    /** BR-10, TC-25: money that was paid is going back. */
    public void startRefund() {
        requireStatus(PaymentStatus.PAID);
        this.status = PaymentStatus.REFUND_PENDING;
    }

    public void markRefunded() {
        requireStatus(PaymentStatus.REFUND_PENDING);
        this.status = PaymentStatus.REFUNDED;
    }

    private void requireStatus(PaymentStatus expected) {
        if (status != expected) {
            throw new IllegalStateException("Payment " + id + " is " + status.dbValue() + ", not " + expected.dbValue());
        }
    }

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    public PaymentMethod getMethod() { return method; }
    public BigDecimal getAmount() { return amount; }
    public PaymentStatus getStatus() { return status; }
    public String getTransactionRef() { return transactionRef; }
    public User getRecordedBy() { return recordedBy; }
    public void setRecordedBy(User recordedBy) { this.recordedBy = recordedBy; }
    public Instant getPaidAt() { return paidAt; }
    public Instant getCreatedAt() { return createdAt; }
    public String getFailureReason() { return failureReason; }
}
