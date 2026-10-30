package mos.management.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** orders.source (FR-24). */
public enum OrderSource implements DbEnum {
    ONLINE, WALK_IN;

    @JsonValue
    @Override
    public String dbValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static OrderSource from(String value) {
        return DbEnum.parse(OrderSource.class, value);
    }

    @jakarta.persistence.Converter
    public static class Jpa extends DbEnum.Converter<OrderSource> {
        public Jpa() {
            super(OrderSource.class);
        }
    }
}
