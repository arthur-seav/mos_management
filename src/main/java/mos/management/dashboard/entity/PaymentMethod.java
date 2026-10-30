package mos.management.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** payments.method. Cash is for walk-in orders only. */
public enum PaymentMethod implements DbEnum {
    KHQR, CARD, CASH;

    @JsonValue
    @Override
    public String dbValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static PaymentMethod from(String value) {
        return DbEnum.parse(PaymentMethod.class, value);
    }

    @jakarta.persistence.Converter
    public static class Jpa extends DbEnum.Converter<PaymentMethod> {
        public Jpa() {
            super(PaymentMethod.class);
        }
    }
}
