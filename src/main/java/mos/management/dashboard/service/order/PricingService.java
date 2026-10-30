package mos.management.dashboard.service.order;

import mos.management.dashboard.dto.MenuDtos.CustomizationGroup;
import mos.management.dashboard.dto.MenuDtos.CustomizationOption;
import mos.management.dashboard.dto.MenuDtos.CustomizationView;
import mos.management.dashboard.dto.OrderDtos.OrderLineRequest;
import mos.management.dashboard.entity.MenuOption;
import mos.management.dashboard.entity.Order;
import mos.management.dashboard.entity.OrderItem;
import mos.management.dashboard.entity.OrderItemOption;
import mos.management.dashboard.entity.Product;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.MenuOptionRepository;
import mos.management.dashboard.repository.ProductRepository;
import mos.management.dashboard.service.menu.MenuQueryService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Works out every line of an order from today's menu (NFR-07, TC-23): the
 * price the app shows is never trusted. Applies the same option rules as
 * the app: BR-01 (ice level only for iced drinks), BR-02 (one per required
 * group, add-ons up to the group's limit), BR-03 (base + options) and
 * BR-05 (sold-out drinks are refused).
 */
@Service
public class PricingService {

    private final ProductRepository products;
    private final MenuOptionRepository options;
    private final MenuQueryService menu;

    public PricingService(ProductRepository products, MenuOptionRepository options, MenuQueryService menu) {
        this.products = products;
        this.options = options;
        this.menu = menu;
    }

    /** Adds the priced lines to the order; prices and labels are copied now (BR-04). */
    public void addLines(Order order, List<OrderLineRequest> lines) {
        for (OrderLineRequest line : lines) {
            Product product = products.findWithCategory(line.productId())
                    .orElseThrow(() -> unavailable("A drink in your cart is no longer on the menu."));
            if (!product.canBeOrdered()) {
                throw unavailable(product.getName() + " is sold out. It was removed from your order.");
            }
            CustomizationView c = menu.customization(product);
            Priced priced = price(c, line.options());
            OrderItem item = new OrderItem(order, product, priced.unitPrice(), line.quantity());
            for (Chosen ch : priced.chosen()) {
                MenuOption option = options.getReferenceById(ch.option().id());
                item.addOption(new OrderItemOption(item, option, ch.label(), ch.option().extraPrice()));
            }
            order.addItem(item);
        }
    }

    record Chosen(CustomizationOption option, String label) {
    }

    record Priced(BigDecimal unitPrice, List<Chosen> chosen) {
    }

    /** BR-01/02/03 for one drink. Package-private for unit tests. */
    static Priced price(CustomizationView c, List<Long> optionIds) {
        Map<Long, CustomizationGroup> groupOfOption = new HashMap<>();
        Map<Long, CustomizationOption> optionById = new HashMap<>();
        for (CustomizationGroup g : c.groups()) {
            for (CustomizationOption o : g.options()) {
                groupOfOption.put(o.id(), g);
                optionById.put(o.id(), o);
            }
        }
        Set<Long> picked = new HashSet<>();
        for (Long id : optionIds) {
            if (!optionById.containsKey(id) || !picked.add(id)) {
                throw invalid(c.product().name() + ": one of the options is not offered any more.");
            }
        }

        boolean iced = isIced(c, picked);
        List<Chosen> chosen = new ArrayList<>();
        BigDecimal price = c.product().basePrice();
        for (CustomizationGroup g : c.groups()) {
            List<CustomizationOption> inGroup = g.options().stream().filter(o -> picked.contains(o.id())).toList();
            boolean visible = !g.needsIcedDrink() || iced;
            if (!visible) {
                if (!inGroup.isEmpty()) throw invalid(c.product().name() + ": " + g.name() + " is only for iced drinks.");
                continue;
            }
            int max = g.selectionType() == mos.management.dashboard.entity.SelectionType.SINGLE ? 1 : g.maxSelect();
            if (inGroup.size() > max) {
                throw invalid(c.product().name() + ": pick up to " + max + " in " + g.name() + ".");   // TC-13
            }
            if (g.isRequired() && inGroup.isEmpty()) {
                throw invalid(c.product().name() + ": " + g.name() + " is required.");                    // TC-12
            }
            for (CustomizationOption o : inGroup) {
                price = price.add(o.extraPrice());
                chosen.add(new Chosen(o, summaryName(g, o)));
            }
        }
        if (price.signum() < 0) price = BigDecimal.ZERO;
        return new Priced(price, chosen);
    }

    /**
     * Same as the app's DrinkSelection.isVisible: if the drink has a
     * temperature choice (a group with an iced option), it is iced only
     * when that option is picked; with no temperature choice it is always
     * iced (frappés) when it offers an ice-level group.
     */
    static boolean isIced(CustomizationView c, Set<Long> picked) {
        for (CustomizationGroup g : c.groups()) {
            var icedOptions = g.options().stream().filter(CustomizationOption::isIced).toList();
            if (icedOptions.isEmpty()) continue;
            return icedOptions.stream().anyMatch(o -> picked.contains(o.id()));
        }
        return true;
    }

    static String summaryName(CustomizationGroup g, CustomizationOption o) {
        String noun = g.summaryNoun();
        if (noun == null || noun.isBlank() || o.name().toLowerCase().contains(noun.toLowerCase())) return o.name();
        return o.name() + " " + noun;
    }

    private static ApiException unavailable(String message) {
        return new ApiException(HttpStatus.CONFLICT, "drink_unavailable", message);
    }

    private static ApiException invalid(String message) {
        return ApiException.badRequest("invalid_options", message);
    }
}
