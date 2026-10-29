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

/** product_option_groups: which groups a drink offers, and the default (BR-01, TC-11). */
@Entity
@Table(name = "product_option_groups")
public class ProductOptionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pog_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id")
    private OptionGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_option_id")
    private MenuOption defaultOption;

    @Column(name = "is_active")
    private boolean active = true;

    protected ProductOptionGroup() {
    }

    public ProductOptionGroup(Product product, OptionGroup group, MenuOption defaultOption) {
        this.product = product;
        this.group = group;
        this.defaultOption = defaultOption;
    }

    public Long getId() { return id; }
    public Product getProduct() { return product; }
    public OptionGroup getGroup() { return group; }
    public MenuOption getDefaultOption() { return defaultOption; }
    public void setDefaultOption(MenuOption defaultOption) { this.defaultOption = defaultOption; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
