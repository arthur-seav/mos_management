package mos.management.dashboard.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import mos.management.dashboard.entity.Category;
import mos.management.dashboard.entity.MenuOption;
import mos.management.dashboard.entity.OptionGroup;
import mos.management.dashboard.entity.Product;
import mos.management.dashboard.entity.SelectionType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Menu, categories and customization options (FR-06 to FR-09, FR-22, FR-25, FR-26). */
public final class MenuDtos {

    private MenuDtos() {
    }

    // ---- categories ----

    public record CategoryView(long id, String name, int sortOrder, boolean active, long productCount) {
        public static CategoryView of(Category c, long productCount) {
            return new CategoryView(c.getId(), c.getName(), c.getSortOrder(), c.isActive(), productCount);
        }
    }

    public record CategoryRequest(@NotBlank(message = "Enter a name.") @Size(max = 50) String name,
                                  int sortOrder,
                                  Boolean active) {
    }

    // ---- products ----

    public record ProductView(long id, long categoryId, String categoryName, String name, String description,
                              String imageUrl, BigDecimal basePrice, boolean isAvailable, boolean isActive,
                              Instant createdAt) {
        public static ProductView of(Product p) {
            return new ProductView(p.getId(), p.getCategory().getId(), p.getCategory().getName(), p.getName(),
                    p.getDescription(), p.getImageUrl(), p.getBasePrice(), p.isAvailable(), p.isActive(),
                    p.getCreatedAt());
        }
    }

    public record ProductRequest(@NotNull(message = "Choose a category.") Long categoryId,
                                 @NotBlank(message = "Enter a name.") @Size(max = 100) String name,
                                 String description,
                                 @Size(max = 255) String imageUrl,
                                 @NotNull(message = "Enter a price.") @DecimalMin(value = "0.00", message = "The price can't be negative.") BigDecimal basePrice,
                                 Boolean isActive) {
    }

    public record AvailabilityRequest(boolean isAvailable) {
    }

    public record ActiveRequest(boolean isActive) {
    }

    // ---- option groups and options ----

    public record OptionView(long id, long groupId, String name, BigDecimal extraPrice, int sortOrder,
                             boolean isActive, boolean isIced) {
        public static OptionView of(MenuOption o) {
            return new OptionView(o.getId(), o.getGroup().getId(), o.getName(), o.getExtraPrice(), o.getSortOrder(),
                    o.isActive(), o.isIced());
        }
    }

    public record OptionGroupView(long id, String name, SelectionType selectionType, boolean isRequired,
                                  int maxSelect, int sortOrder, boolean needsIcedDrink, String summaryNoun,
                                  List<OptionView> options) {
        public static OptionGroupView of(OptionGroup g) {
            return new OptionGroupView(g.getId(), g.getName(), g.getSelectionType(), g.isRequired(), g.getMaxSelect(),
                    g.getSortOrder(), g.isNeedsIcedDrink(), g.getSummaryNoun(),
                    g.getOptions().stream().map(OptionView::of).toList());
        }
    }

    public record OptionGroupRequest(@NotBlank(message = "Enter a name.") @Size(max = 50) String name,
                                     @NotNull SelectionType selectionType,
                                     boolean isRequired,
                                     @Min(1) @Max(20) int maxSelect,
                                     int sortOrder,
                                     boolean needsIcedDrink,
                                     @Size(max = 20) String summaryNoun) {
    }

    public record OptionRequest(@NotBlank(message = "Enter a name.") @Size(max = 50) String name,
                                @NotNull(message = "Enter a price (0 if free).") BigDecimal extraPrice,
                                int sortOrder,
                                boolean isIced,
                                Boolean isActive) {
    }

    // ---- one drink's options (product_option_groups + product_options) ----

    /** One option as a drink offers it. {@code priceOverride} null = the option's own price. */
    public record ProductOptionSetting(long optionId, String name, BigDecimal groupPrice, boolean offered,
                                       BigDecimal priceOverride, boolean optionActive) {
    }

    public record ProductGroupSetting(long groupId, String name, SelectionType selectionType, boolean isRequired,
                                      int maxSelect, boolean offered, boolean isActive, Long defaultOptionId,
                                      List<ProductOptionSetting> options) {
    }

    public record ProductOptionsView(long productId, String productName, List<ProductGroupSetting> groups) {
    }

    public record ProductOptionChoice(long optionId, BigDecimal priceOverride) {
    }

    public record ProductGroupChoice(long groupId, boolean isActive, Long defaultOptionId,
                                     @Valid List<ProductOptionChoice> options) {
    }

    /** Replaces everything a drink offers. Groups left out are no longer offered. */
    public record ProductOptionsRequest(@Valid List<ProductGroupChoice> groups) {
    }

    // ---- what the customer (or a staff member taking a walk-in order) chooses from ----

    public record CustomizationOption(long id, long groupId, String name, BigDecimal extraPrice, boolean isIced) {
    }

    public record CustomizationGroup(long id, String name, SelectionType selectionType, boolean isRequired,
                                     int maxSelect, boolean needsIcedDrink, String summaryNoun,
                                     List<CustomizationOption> options, Long defaultOptionId) {
    }

    public record CustomizationView(ProductView product, List<CustomizationGroup> groups, BigDecimal lowestPrice) {
    }

    public record MenuView(List<CategoryView> categories, List<ProductView> products) {
    }

    public record ImageView(String imageUrl) {
    }
}
