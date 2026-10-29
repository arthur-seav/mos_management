package mos.management.dashboard.exception;

import org.springframework.http.HttpStatus;

/**
 * A failure the client should show: {@code code} is stable for programs
 * (the app maps "ordering_paused" to its own enum), {@code message} is
 * for people.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, "not_found", what + " not found.");
    }

    public static ApiException badRequest(String code, String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, code, message);
    }

    public static ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
