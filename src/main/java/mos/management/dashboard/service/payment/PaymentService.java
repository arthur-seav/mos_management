package mos.management.dashboard.service.payment;

import mos.management.dashboard.dto.OrderDtos.KhqrChargeView;
import mos.management.dashboard.entity.Order;
import mos.management.dashboard.entity.OrderStatus;
import mos.management.dashboard.entity.Payment;
import mos.management.dashboard.entity.PaymentMethod;
import mos.management.dashboard.entity.PaymentStatus;
import mos.management.dashboard.entity.SavedCard;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.PaymentRepository;
import mos.management.dashboard.repository.SavedCardRepository;
import mos.management.dashboard.service.order.OrderPlacement;
import mos.management.dashboard.service.order.OrderService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;

/**
 * Online payments (FR-13, SA 4.2.3): KHQR and saved cards. An order can
 * have several tries (TC-22: failed, then paid); the first paid one places
 * the order.
 */
@Service
@Transactional
public class PaymentService {

    private final OrderService orders;
    private final OrderPlacement placement;
    private final PaymentRepository payments;
    private final SavedCardRepository cards;
    private final PaymentGateway gateway;
    private final Clock clock;

    public PaymentService(OrderService orders, OrderPlacement placement, PaymentRepository payments,
                          SavedCardRepository cards, PaymentGateway gateway, Clock clock) {
        this.orders = orders;
        this.placement = placement;
        this.payments = payments;
        this.cards = cards;
        this.gateway = gateway;
        this.clock = clock;
    }

    public KhqrChargeView startKhqr(long customerId, long orderId) {
        Order order = payable(customerId, orderId);
        Instant now = clock.instant();
        Payment payment = newPayment(order, PaymentMethod.KHQR, now);
        PaymentGateway.KhqrCode code = gateway.createKhqr(payment, now);
        return new KhqrChargeView(payment.getId(), order.getId(), code.qrData(), payment.getAmount(),
                code.merchantName(), code.expiresAt());
    }

    /** Polled by the KHQR page; the gateway says when the bank has paid. */
    public Payment check(long customerId, long paymentId) {
        Payment payment = own(customerId, paymentId);
        if (payment.getStatus() == PaymentStatus.PENDING && payment.getMethod() == PaymentMethod.KHQR) {
            apply(payment, gateway.khqrStatus(payment, clock.instant()));
        }
        return payment;
    }

    /** "Cancel payment": the order stays unpaid and can be paid another way. */
    public Payment cancel(long customerId, long paymentId) {
        Payment payment = own(customerId, paymentId);
        if (payment.getStatus() == PaymentStatus.PENDING) payment.markFailed("Payment cancelled.");
        return payment;
    }

    /** A declined card is a failed payment, not an error (TC-22). */
    public Payment payWithCard(long customerId, long orderId, long cardId) {
        Order order = payable(customerId, orderId);
        SavedCard card = cards.findByIdAndUserId(cardId, customerId).orElseThrow(() -> ApiException.notFound("Card"));
        Payment payment = newPayment(order, PaymentMethod.CARD, clock.instant());
        apply(payment, gateway.charge(card.getGatewayToken(), payment.getAmount(), payment));
        return payment;
    }

    private void apply(Payment payment, PaymentGateway.Outcome outcome) {
        switch (outcome) {
            case PaymentGateway.Paid paid -> {
                Order order = payment.getOrder();
                if (order.getStatus() == OrderStatus.PENDING_PAYMENT) {
                    payment.markPaid(paid.transactionRef(), clock.instant());
                    placement.place(order, clock.instant());
                } else {
                    // Paid after the order was abandoned: give the money back.
                    payment.markPaid(paid.transactionRef(), clock.instant());
                    payment.startRefund();
                }
            }
            case PaymentGateway.Failed failed -> payment.markFailed(failed.reason());
            case PaymentGateway.Waiting w -> { }
        }
    }

    private Order payable(long customerId, long orderId) {
        Order order = orders.customerOrder(customerId, orderId);
        if (order.getStatus() != OrderStatus.PENDING_PAYMENT) {
            throw ApiException.conflict("already_paid", "This order is not waiting for payment.");
        }
        order.getPayments().stream().filter(p -> p.getStatus() == PaymentStatus.PENDING)
                .forEach(p -> p.markFailed("Replaced by a new payment."));
        return order;
    }

    private Payment newPayment(Order order, PaymentMethod method, Instant now) {
        Payment payment = new Payment(order, method, order.getTotalAmount(), now);
        order.addPayment(payment);
        return payments.saveAndFlush(payment);
    }

    private Payment own(long customerId, long paymentId) {
        return payments.findById(paymentId)
                .filter(p -> p.getOrder().getCustomer() != null && p.getOrder().getCustomer().getId() == customerId)
                .orElseThrow(() -> ApiException.notFound("Payment"));
    }
}
