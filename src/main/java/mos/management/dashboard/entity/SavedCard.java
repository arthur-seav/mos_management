package mos.management.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/** saved_cards. Only the gateway token and the masked number are kept. */
@Entity
@Table(name = "saved_cards")
public class SavedCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "card_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    private String gatewayToken;
    private String cardBrand;
    private String maskedNumber;
    private short expiryMonth;
    private short expiryYear;
    private String holderName;
    private Instant createdAt;

    protected SavedCard() {
    }

    public SavedCard(User user, String gatewayToken, String cardBrand, String maskedNumber,
                     int expiryMonth, int expiryYear, String holderName, Instant createdAt) {
        this.user = user;
        this.gatewayToken = gatewayToken;
        this.cardBrand = cardBrand;
        this.maskedNumber = maskedNumber;
        this.expiryMonth = (short) expiryMonth;
        this.expiryYear = (short) expiryYear;
        this.holderName = holderName;
        this.createdAt = createdAt;
    }

    /** "4242" from "•••• •••• •••• 4242". */
    public String last4() {
        return maskedNumber.substring(maskedNumber.length() - 4);
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getGatewayToken() { return gatewayToken; }
    public String getCardBrand() { return cardBrand; }
    public String getMaskedNumber() { return maskedNumber; }
    public int getExpiryMonth() { return expiryMonth; }
    public int getExpiryYear() { return expiryYear; }
    public String getHolderName() { return holderName; }
    public Instant getCreatedAt() { return createdAt; }
}
