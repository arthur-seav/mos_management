package mos.management.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * orders.status and the BR-08 state machine. Orders only move forward:
 * pending_payment -> placed -> confirmed -> preparing -> ready -> completed,
 * or end early as abandoned, cancelled or rejected.
 */
public enum OrderStatus implements DbEnum {
    PENDING_PAYMENT, PLACED, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED, REJECTED, ABANDONED;

    @JsonValue
    @Override
    public String dbValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static OrderStatus from(String value) {
        return DbEnum.parse(OrderStatus.class, value);
    }

    /** The one-tap next step for staff (NFR-04), or null when there is none. */
    public OrderStatus next() {
        return switch (this) {
            case PLACED -> CONFIRMED;
            case CONFIRMED -> PREPARING;
            case PREPARING -> READY;
            case READY -> COMPLETED;
            default -> null;
        };
    }

    /** Placed to ready: in the staff queue (FR-19). */
    public boolean inQueue() {
        return this == PLACED || this == CONFIRMED || this == PREPARING || this == READY;
    }

    public boolean endedEarly() {
        return this == CANCELLED || this == REJECTED || this == ABANDONED;
    }

    /** Counted as a sale in reports: it reached staff and was not called off. */
    public boolean isSale() {
        return inQueue() || this == COMPLETED;
    }

    @jakarta.persistence.Converter
    public static class Jpa extends DbEnum.Converter<OrderStatus> {
        public Jpa() {
            super(OrderStatus.class);
        }
    }
}
