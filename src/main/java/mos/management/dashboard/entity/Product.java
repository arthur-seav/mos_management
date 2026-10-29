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
import java.time.Instant;

/** products: the drinks (FR-07, FR-25). */
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    private String name;
    private String description;
    private String imageUrl = "";
    private BigDecimal basePrice;

    /** False = sold out (FR-22). */
    @Column(name = "is_available")
    private boolean available = true;

    /** False = removed from the menu (FR-25). */
    @Column(name = "is_active")
    private boolean active = true;

    private Instant createdAt;

    protected Product() {
    }

    public Product(Category category, String name, String description, BigDecimal basePrice, Instant createdAt) {
        this.category = category;
        this.name = name;
        this.description = description;
        this.basePrice = basePrice;
        this.createdAt = createdAt;
    }

    /** BR-05: on the menu and not sold out. */
    public boolean canBeOrdered() {
        return active && available && category.isActive();
    }

    public Long getId() { return id; }
    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl == null ? "" : imageUrl; }
    public BigDecimal getBasePrice() { return basePrice; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
    public boolean isAvailable() { return available; }
    public void setAvailable(boolean available) { this.available = available; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
}
