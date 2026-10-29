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

import java.math.BigDecimal;

/**
 * product_options: an option a drink offers, with an optional price of its
 * own (TC-14, TC-15). Null extra price = the option's own price.
 */
@Entity
@Table(name = "product_options")
public class ProductOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_option_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "option_id")
    private MenuOption option;

    private BigDecimal extraPrice;

    protected ProductOption() {
    }

    public ProductOption(Product product, MenuOption option, BigDecimal extraPrice) {
        this.product = product;
        this.option = option;
        this.extraPrice = extraPrice;
    }

    /** The price for this drink. */
    public BigDecimal effectivePrice() {
        return extraPrice != null ? extraPrice : option.getExtraPrice();
    }

    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public MenuOption getOption() { return option; }
    public BigDecimal getExtraPrice() { return extraPrice; }
    public void setExtraPrice(BigDecimal extraPrice) { this.extraPrice = extraPrice; }
}
