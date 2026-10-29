package mos.management.dashboard.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** order_items. Name and prices are copied when the order is placed (BR-04). */
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_item_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    private String productName;
    private BigDecimal unitPrice;
    private short quantity;
    private BigDecimal lineTotal;

    @OneToMany(mappedBy = "orderItem", cascade = CascadeType.ALL)
    @OrderBy("id ASC")
    private List<OrderItemOption> options = new ArrayList<>();

    protected OrderItem() {
    }

    public OrderItem(Order order, Product product, BigDecimal unitPrice, int quantity) {
        this.order = order;
        this.product = product;
        this.productName = product.getName();
        this.unitPrice = unitPrice;
        this.quantity = (short) quantity;
        this.lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));   // BR-03
    }

    public void addOption(OrderItemOption option) {
        options.add(option);
    }

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    public Product getProduct() { return product; }
    public String getProductName() { return productName; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public int getQuantity() { return quantity; }
    public BigDecimal getLineTotal() { return lineTotal; }
    public List<OrderItemOption> getOptions() { return options; }
}
