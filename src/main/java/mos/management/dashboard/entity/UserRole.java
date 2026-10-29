package mos.management.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** SA 1.5 user roles. Customers use the app; staff and admins the dashboard. */
public enum UserRole implements DbEnum {
    CUSTOMER, STAFF, ADMIN;

    @JsonValue
    @Override
    public String dbValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static UserRole from(String value) {
        return DbEnum.parse(UserRole.class, value);
    }

    public boolean worksOnDashboard() {
        return this == STAFF || this == ADMIN;
    }

    @jakarta.persistence.Converter
    public static class Jpa extends DbEnum.Converter<UserRole> {
        public Jpa() {
            super(UserRole.class);
        }
    }
}
