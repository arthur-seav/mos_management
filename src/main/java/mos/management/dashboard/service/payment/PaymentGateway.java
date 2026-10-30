package mos.management.dashboard.service.payment;

import mos.management.dashboard.entity.Payment;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * The outside payment system (SA 3.1 context diagram). The demo build uses
 * {@link SimulatedPaymentGateway}; a real bank (ABA, Bakong KHQR) would be
 * another implementation of this interface.
 */
public interface PaymentGateway {

    record KhqrCode(String qrData, String merchantName, Instant expiresAt) {
    }

    record CardToken(String token, String brand, String last4) {
    }

    sealed interface Outcome permits Paid, Failed, Waiting {
    }

    record Paid(String transactionRef) implements Outcome {
    }

    record Failed(String reason) implements Outcome {
    }

    record Waiting() implements Outcome {
    }

    KhqrCode createKhqr(Payment payment, Instant now);

    /** Asked while the KHQR page is open. */
    Outcome khqrStatus(Payment payment, Instant now);

    /** Turns a card into a token; throws CardRejected for a bad number. */
    CardToken tokenize(String number, int expiryMonth, int expiryYear, String cvv);

    Outcome charge(String cardToken, BigDecimal amount, Payment payment);

    class CardRejected extends RuntimeException {
        public CardRejected(String message) {
            super(message);
        }
    }
}
