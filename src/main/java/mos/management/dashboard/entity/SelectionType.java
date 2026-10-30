package mos.management.dashboard.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/** option_groups.selection_type */
public enum SelectionType implements DbEnum {
    SINGLE, MULTIPLE;

    @JsonValue
    @Override
    public String dbValue() {
        return name().toLowerCase();
    }

    @JsonCreator
    public static SelectionType from(String value) {
        return DbEnum.parse(SelectionType.class, value);
    }

    @jakarta.persistence.Converter
    public static class Jpa extends DbEnum.Converter<SelectionType> {
        public Jpa() {
            super(SelectionType.class);
        }
    }
}
