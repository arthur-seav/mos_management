package mos.management.dashboard.service.menu;

import mos.management.dashboard.dto.MenuDtos.CategoryView;
import mos.management.dashboard.dto.MenuDtos.CustomizationGroup;
import mos.management.dashboard.dto.MenuDtos.CustomizationOption;
import mos.management.dashboard.dto.MenuDtos.CustomizationView;
import mos.management.dashboard.dto.MenuDtos.MenuView;
import mos.management.dashboard.dto.MenuDtos.ProductView;
import mos.management.dashboard.entity.Product;
import mos.management.dashboard.entity.ProductOption;
import mos.management.dashboard.entity.ProductOptionGroup;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.CategoryRepository;
import mos.management.dashboard.repository.ProductOptionGroupRepository;
import mos.management.dashboard.repository.ProductOptionRepository;
import mos.management.dashboard.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Reads the menu the way customers see it: active categories and drinks
 * (FR-06, FR-07), and one drink's option groups with this drink's prices
 * and defaults (FR-08, BR-01, TC-11, TC-14, TC-15). Used by the app API,
 * by walk-in ordering and by the price check when an order is placed.
 */
@Service
@Transactional(readOnly = true)
public class MenuQueryService {

    private final CategoryRepository categories;
    private final ProductRepository products;
    private final ProductOptionGroupRepository productGroups;
    private final ProductOptionRepository productOptions;

    public MenuQueryService(CategoryRepository categories, ProductRepository products,
                            ProductOptionGroupRepository productGroups, ProductOptionRepository productOptions) {
        this.categories = categories;
        this.products = products;
        this.productGroups = productGroups;
        this.productOptions = productOptions;
    }

    /** Active categories and their active drinks; sold-out drinks stay, marked (TC-09). */
    public MenuView menu() {
        var cats = categories.findByActiveTrueOrderBySortOrderAscIdAsc().stream()
                .map(c -> CategoryView.of(c, 0)).toList();
        var items = products.findOnMenu().stream().map(ProductView::of).toList();
        return new MenuView(cats, items);
    }

    public CustomizationView customization(long productId) {
        Product product = products.findWithCategory(productId)
                .filter(p -> p.isActive() && p.getCategory().isActive())
                .orElseThrow(() -> ApiException.notFound("Drink"));
        return customization(product);
    }

    public CustomizationView customization(Product product) {
        Map<Long, List<ProductOption>> offered = productOptions.findForProduct(product.getId()).stream()
                .filter(po -> po.getOption().isActive())
                .collect(Collectors.groupingBy(po -> po.getOption().getGroup().getId()));

        List<CustomizationGroup> groups = productGroups.findForProduct(product.getId()).stream()
                .filter(ProductOptionGroup::isActive)
                .map(pog -> {
                    var g = pog.getGroup();
                    var options = offered.getOrDefault(g.getId(), List.of()).stream()
                            .sorted(Comparator.comparingInt((ProductOption po) -> po.getOption().getSortOrder())
                                    .thenComparing(po -> po.getOption().getId()))
                            .map(po -> new CustomizationOption(po.getOption().getId(), g.getId(),
                                    po.getOption().getName(), po.effectivePrice(), po.getOption().isIced()))
                            .toList();
                    Long def = pog.getDefaultOption() == null ? null : pog.getDefaultOption().getId();
                    boolean defaultOffered = def != null && options.stream().anyMatch(o -> o.id() == def);
                    return new CustomizationGroup(g.getId(), g.getName(), g.getSelectionType(), g.isRequired(),
                            g.getMaxSelect(), g.isNeedsIcedDrink(), g.getSummaryNoun(), options,
                            defaultOffered ? def : null);
                })
                .filter(g -> !g.options().isEmpty())
                .toList();

        return new CustomizationView(ProductView.of(product), groups, lowestPrice(product.getBasePrice(), groups));
    }

    /** "From $X": base price with the cheapest choice in every required group (same as the app). */
    static BigDecimal lowestPrice(BigDecimal base, List<CustomizationGroup> groups) {
        return groups.stream()
                .filter(CustomizationGroup::isRequired)
                .map(g -> g.options().stream().map(CustomizationOption::extraPrice).min(BigDecimal::compareTo)
                        .orElse(BigDecimal.ZERO))
                .reduce(base, BigDecimal::add);
    }

    /** BR-05: of these drinks, the ones that can't be ordered now. */
    public Set<Long> unavailable(Collection<Long> productIds) {
        var found = products.findByIdIn(List.copyOf(productIds)).stream()
                .collect(Collectors.toMap(Product::getId, p -> p));
        return productIds.stream()
                .filter(id -> found.get(id) == null || !found.get(id).canBeOrdered())
                .collect(Collectors.toCollection(java.util.TreeSet::new));
    }
}
