package mos.management.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** users.status */
public enum AccountStatus implements DbEnum {
    ACTIVE, INACTIVE;

    @JsonValue
    @Override
    public String dbValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static AccountStatus from(String value) {
        return DbEnum.parse(AccountStatus.class, value);
    }

    @jakarta.persistence.Converter
    public static class Jpa extends DbEnum.Converter<AccountStatus> {
        public Jpa() {
            super(AccountStatus.class);
        }
    }
}
