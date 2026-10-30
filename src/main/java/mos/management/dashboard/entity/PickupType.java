package mos.management.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** orders.pickup_type (FR-11). */
public enum PickupType implements DbEnum {
    ASAP, SCHEDULED;

    @JsonValue
    @Override
    public String dbValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static PickupType from(String value) {
        return DbEnum.parse(PickupType.class, value);
    }

    @jakarta.persistence.Converter
    public static class Jpa extends DbEnum.Converter<PickupType> {
        public Jpa() {
            super(PickupType.class);
        }
    }
}
