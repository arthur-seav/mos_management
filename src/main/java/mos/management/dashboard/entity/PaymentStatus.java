package mos.management.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** payments.status. Refunds are tracked here, not on the order (SA 3.3). */
public enum PaymentStatus implements DbEnum {
    PENDING, PAID, FAILED, REFUND_PENDING, REFUNDED;

    @JsonValue
    @Override
    public String dbValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static PaymentStatus from(String value) {
        return DbEnum.parse(PaymentStatus.class, value);
    }

    @jakarta.persistence.Converter
    public static class Jpa extends DbEnum.Converter<PaymentStatus> {
        public Jpa() {
            super(PaymentStatus.class);
        }
    }
}
