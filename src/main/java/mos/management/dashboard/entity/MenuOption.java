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

/** options: one choice in a group, e.g. Medium, Less ice, Oat milk. */
@Entity
@Table(name = "options")
public class MenuOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "option_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id")
    private OptionGroup group;

    private String name;

    /** Added to the base price; may be negative (a single shot). */
    private BigDecimal extraPrice = BigDecimal.ZERO;

    private int sortOrder;

    @Column(name = "is_active")
    private boolean active = true;

    /** True for "Iced" in the temperature group. Not in SA. */
    private boolean isIced;

    protected MenuOption() {
    }

    public MenuOption(OptionGroup group, String name, BigDecimal extraPrice, int sortOrder) {
        this.group = group;
        this.name = name;
        this.extraPrice = extraPrice;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public OptionGroup getGroup() { return group; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getExtraPrice() { return extraPrice; }
    public void setExtraPrice(BigDecimal extraPrice) { this.extraPrice = extraPrice; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isIced() { return isIced; }
    public void setIced(boolean iced) { isIced = iced; }
}
