package mos.management.dashboard.util;

import com.google.i18n.phonenumbers.NumberParseException;
import com.google.i18n.phonenumbers.PhoneNumberUtil;
import com.google.i18n.phonenumbers.PhoneNumberUtil.PhoneNumberFormat;
import com.google.i18n.phonenumbers.Phonenumber.PhoneNumber;

import java.util.Optional;

/**
 * One spelling per phone number, the same rule as the customer app's
 * {@code normalizePhone}: "+855 12 345 678", "012-345-678" and "012345678"
 * are the same account. Cambodian numbers become "012345678"; others keep
 * the international form ("+66 81 234 5678").
 */
public final class PhoneNumbers {

    private static final String DEFAULT_REGION = "KH";
    private static final PhoneNumberUtil UTIL = PhoneNumberUtil.getInstance();

    private PhoneNumbers() {
    }

    /** The stored form, or empty when {@code value} is not a valid number. */
    public static Optional<String> normalize(String value) {
        if (value == null || value.isBlank()) return Optional.empty();
        try {
            PhoneNumber number = UTIL.parse(value.trim(), DEFAULT_REGION);
            if (!UTIL.isValidNumber(number)) return Optional.empty();
            if (DEFAULT_REGION.equals(UTIL.getRegionCodeForNumber(number))) {
                return Optional.of("0" + number.getNationalNumber());
            }
            return Optional.of(UTIL.format(number, PhoneNumberFormat.INTERNATIONAL));
        } catch (NumberParseException e) {
            return Optional.empty();
        }
    }
}
