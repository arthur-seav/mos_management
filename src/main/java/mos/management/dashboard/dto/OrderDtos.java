package mos.management.dashboard.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import mos.management.dashboard.entity.Order;
import mos.management.dashboard.entity.OrderItem;
import mos.management.dashboard.entity.OrderSource;
import mos.management.dashboard.entity.OrderStatus;
import mos.management.dashboard.entity.Payment;
import mos.management.dashboard.entity.PaymentMethod;
import mos.management.dashboard.entity.PaymentStatus;
import mos.management.dashboard.entity.PickupType;
import mos.management.dashboard.entity.SavedCard;
import mos.management.dashboard.entity.User;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Orders and payments, for the app and the dashboard. */
public final class OrderDtos {

    private OrderDtos() {
    }

    // ---- requests ----

    /** No prices: the server works them out (NFR-07, TC-23). */
    public record OrderLineRequest(@NotNull Long productId,
                                   List<Long> optionIds,
                                   @Min(value = 1, message = "Quantity is at least 1.") @Max(20) int quantity) {
        public List<Long> options() {
            return optionIds == null ? List.of() : optionIds;
        }
    }

    public record OrderRequest(@NotEmpty(message = "The cart is empty.") @Valid List<OrderLineRequest> lines,
                               @NotNull PickupType pickupType,
                               Instant pickupTime,
                               @Size(max = 500) String note) {
    }

    public record WalkInRequest(@NotEmpty(message = "Add at least one drink.") @Valid List<OrderLineRequest> lines,
                                @Size(max = 500) String note,
                                BigDecimal cashReceived) {
    }

    public record CardPaymentRequest(@NotNull Long cardId) {
    }

    public record RejectRequest(@NotNull @Size(min = 1, max = 255, message = "Pick a reason.") String reason) {
    }

    public record NewCardRequest(@NotNull String number, String holderName,
                                 @Min(1) @Max(12) int expiryMonth, @Min(2000) @Max(2100) int expiryYear,
                                 @NotNull String cvv) {
    }

    // ---- views ----

    public record PaymentView(long id, long orderId, PaymentMethod method, BigDecimal amount, PaymentStatus status,
                              String transactionRef, Instant paidAt, Instant createdAt, String failureReason,
                              String recordedBy) {
        public static PaymentView of(Payment p) {
            return new PaymentView(p.getId(), p.getOrder().getId(), p.getMethod(), p.getAmount(), p.getStatus(),
                    p.getTransactionRef(), p.getPaidAt(), p.getCreatedAt(), p.getFailureReason(),
                    p.getRecordedBy() == null ? null : p.getRecordedBy().fullName());
        }
    }

    public record OrderItemView(long productId, String productName, List<Long> optionIds, List<String> optionNames,
                                BigDecimal unitPrice, int quantity, BigDecimal lineTotal) {
        public static OrderItemView of(OrderItem i) {
            return new OrderItemView(i.getProduct().getId(), i.getProductName(),
                    i.getOptions().stream().map(o -> o.getOption().getId()).toList(),
                    i.getOptions().stream().map(o -> o.getOptionName()).toList(),
                    i.getUnitPrice(), i.getQuantity(), i.getLineTotal());
        }
    }

    public record PersonView(long id, String name, String email, String phone) {
        public static PersonView of(User u) {
            return u == null ? null : new PersonView(u.getId(), u.fullName(), u.getEmail(), u.getPhone());
        }
    }

    public record OrderView(long id, String pickupCode, OrderSource source, OrderStatus status, PickupType pickupType,
                            Instant pickupTime, String note, BigDecimal totalAmount, String rejectReason,
                            Instant createdAt, Instant placedAt, Instant confirmedAt, Instant preparingAt,
                            Instant readyAt, Instant completedAt, Instant endedAt, Long customerId,
                            PersonView customer, PersonView handledBy,
                            List<OrderItemView> items, List<PaymentView> payments, int drinkCount) {
        public static OrderView of(Order o) {
            return new OrderView(o.getId(), o.getPickupCode(), o.getSource(), o.getStatus(), o.getPickupType(),
                    o.getPickupTime(), o.getNote(), o.getTotalAmount(), o.getRejectReason(), o.getCreatedAt(),
                    o.getPlacedAt(), o.getConfirmedAt(), o.getPreparingAt(), o.getReadyAt(), o.getCompletedAt(),
                    o.getEndedAt(), o.getCustomer() == null ? null : o.getCustomer().getId(),
                    PersonView.of(o.getCustomer()), PersonView.of(o.getHandledBy()),
                    o.getItems().stream().map(OrderItemView::of).toList(),
                    o.getPayments().stream().map(PaymentView::of).toList(), o.drinkCount());
        }
    }

    public record KhqrChargeView(long paymentId, long orderId, String qrData, BigDecimal amount, String merchantName,
                                 Instant expiresAt) {
    }

    public record CardView(long id, String brand, String last4, int expiryMonth, int expiryYear, String holderName,
                           String maskedNumber) {
        public static CardView of(SavedCard c) {
            return new CardView(c.getId(), c.getCardBrand(), c.last4(), c.getExpiryMonth(), c.getExpiryYear(),
                    c.getHolderName(), c.getMaskedNumber());
        }
    }
}
