package mos.management.dashboard.service.payment;

import mos.management.dashboard.entity.Payment;
import mos.management.dashboard.repository.StoreSettingsRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.YearMonth;

/**
 * A pretend bank for the demo, matching the app's mock: a KHQR code is
 * "paid" 5 seconds after it is shown and expires after 5 minutes; a card
 * ending in 0002 (4000 0000 0000 0002) is declined (TC-22). No real money
 * moves. See README "Demo mode".
 */
@Component
public class SimulatedPaymentGateway implements PaymentGateway {

    public static final Duration KHQR_PAYS_AFTER = Duration.ofSeconds(5);
    public static final Duration KHQR_EXPIRES_AFTER = Duration.ofMinutes(5);
    public static final String DECLINED_LAST4 = "0002";

    private final StoreSettingsRepository settings;

    public SimulatedPaymentGateway(StoreSettingsRepository settings) {
        this.settings = settings;
    }

    @Override
    public KhqrCode createKhqr(Payment payment, Instant now) {
        // Not a real EMV KHQR string; enough for the app to draw a QR code.
        String data = "MOSKHQR|payment=" + payment.getId() + "|amount=" + payment.getAmount().toPlainString() + "|USD";
        return new KhqrCode(data, settings.current().getStoreName(), now.plus(KHQR_EXPIRES_AFTER));
    }

    @Override
    public Outcome khqrStatus(Payment payment, Instant now) {
        if (!now.isBefore(payment.getCreatedAt().plus(KHQR_EXPIRES_AFTER))) return new Failed("The QR code expired.");
        if (!now.isBefore(payment.getCreatedAt().plus(KHQR_PAYS_AFTER))) return new Paid("SIM-KHQR-" + payment.getId());
        return new Waiting();
    }

    @Override
    public CardToken tokenize(String number, int expiryMonth, int expiryYear, String cvv) {
        String digits = number == null ? "" : number.replaceAll("[\\s-]", "");
        if (!digits.matches("\\d{13,19}") || !luhn(digits)) throw new CardRejected("Check the card number.");
        if (cvv == null || !cvv.matches("\\d{3,4}")) throw new CardRejected("Check the security code.");
        if (YearMonth.of(expiryYear, expiryMonth).isBefore(YearMonth.now())) throw new CardRejected("This card has expired.");
        String brand = digits.startsWith("4") ? "Visa" : digits.matches("^5[1-5].*|^2[2-7].*") ? "Mastercard" : "Card";
        String last4 = digits.substring(digits.length() - 4);
        return new CardToken("sim_tok_" + last4 + "_" + Integer.toHexString(digits.hashCode()), brand, last4);
    }

    @Override
    public Outcome charge(String cardToken, BigDecimal amount, Payment payment) {
        if (cardToken.startsWith("sim_tok_" + DECLINED_LAST4 + "_")) return new Failed("Your card was declined.");
        return new Paid("SIM-CARD-" + payment.getId());
    }

    static boolean luhn(String digits) {
        int sum = 0;
        boolean dbl = false;
        for (int i = digits.length() - 1; i >= 0; i--) {
            int d = digits.charAt(i) - '0';
            if (dbl) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            sum += d;
            dbl = !dbl;
        }
        return sum % 10 == 0;
    }
}
