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
 * order_item_options. option_name holds the line label the customer saw
 * ("Less ice"), copied when the order is placed (BR-04).
 */
@Entity
@Table(name = "order_item_options")
public class OrderItemOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_option_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id")
    private OrderItem orderItem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "option_id")
    private MenuOption option;

    private String optionName;
    private BigDecimal extraPrice;

    protected OrderItemOption() {
    }

    public OrderItemOption(OrderItem orderItem, MenuOption option, String optionName, BigDecimal extraPrice) {
        this.orderItem = orderItem;
        this.option = option;
        this.optionName = optionName;
        this.extraPrice = extraPrice;
    }

    public Long getId() { return id; }
    public MenuOption getOption() { return option; }
    public String getOptionName() { return optionName; }
    public BigDecimal getExtraPrice() { return extraPrice; }
}
