package mos.management.dashboard.util;

/** Small string helpers for request fields. */
public final class Text {

    private Text() {
    }

    /** Trimmed, or null when blank. */
    public static String blankToNull(String value) {
        if (value == null) return null;
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }

    public static String trimOrEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
