package mos.management.dashboard.entity;

import jakarta.persistence.AttributeConverter;

import java.util.Arrays;

/**
 * An enum stored as the lower-case text the SA data dictionary uses
 * ("pending_payment", "walk_in"). The same text is used in the JSON API.
 */
public interface DbEnum {

    String dbValue();

    static <E extends Enum<E> & DbEnum> E parse(Class<E> type, String value) {
        return Arrays.stream(type.getEnumConstants())
                .filter(e -> e.dbValue().equalsIgnoreCase(value) || e.name().equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown " + type.getSimpleName() + ": " + value));
    }

    /** JPA converter base; each enum declares a nested subclass. */
    abstract class Converter<E extends Enum<E> & DbEnum> implements AttributeConverter<E, String> {
        private final Class<E> type;

        protected Converter(Class<E> type) {
            this.type = type;
        }

        @Override
        public String convertToDatabaseColumn(E value) {
            return value == null ? null : value.dbValue();
        }

        @Override
        public E convertToEntityAttribute(String value) {
            return value == null ? null : parse(type, value);
        }
    }
}
