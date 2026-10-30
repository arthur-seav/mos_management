package mos.management.dashboard.service.menu;

import mos.management.dashboard.dto.MenuDtos.OptionGroupRequest;
import mos.management.dashboard.dto.MenuDtos.OptionGroupView;
import mos.management.dashboard.dto.MenuDtos.OptionRequest;
import mos.management.dashboard.dto.MenuDtos.OptionView;
import mos.management.dashboard.dto.MenuDtos.ProductGroupChoice;
import mos.management.dashboard.dto.MenuDtos.ProductGroupSetting;
import mos.management.dashboard.dto.MenuDtos.ProductOptionChoice;
import mos.management.dashboard.dto.MenuDtos.ProductOptionSetting;
import mos.management.dashboard.dto.MenuDtos.ProductOptionsRequest;
import mos.management.dashboard.dto.MenuDtos.ProductOptionsView;
import mos.management.dashboard.entity.MenuOption;
import mos.management.dashboard.entity.OptionGroup;
import mos.management.dashboard.entity.Product;
import mos.management.dashboard.entity.ProductOption;
import mos.management.dashboard.entity.ProductOptionGroup;
import mos.management.dashboard.entity.SelectionType;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.MenuOptionRepository;
import mos.management.dashboard.repository.OptionGroupRepository;
import mos.management.dashboard.repository.ProductOptionGroupRepository;
import mos.management.dashboard.repository.ProductOptionRepository;
import mos.management.dashboard.repository.ProductRepository;
import mos.management.dashboard.util.Text;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Customization options for admins (FR-26): option groups, options and
 * their extra charges, and for each drink which groups and options it
 * offers, at what price, with which default (BR-01, TC-11, TC-14, TC-15).
 */
@Service
@Transactional
public class OptionAdminService {

    private final OptionGroupRepository groups;
    private final MenuOptionRepository options;
    private final ProductRepository products;
    private final ProductOptionGroupRepository productGroups;
    private final ProductOptionRepository productOptions;

    public OptionAdminService(OptionGroupRepository groups, MenuOptionRepository options, ProductRepository products,
                              ProductOptionGroupRepository productGroups, ProductOptionRepository productOptions) {
        this.groups = groups;
        this.options = options;
        this.products = products;
        this.productGroups = productGroups;
        this.productOptions = productOptions;
    }

    @Transactional(readOnly = true)
    public List<OptionGroupView> groups() {
        return groups.findAllByOrderBySortOrderAscIdAsc().stream().map(OptionGroupView::of).toList();
    }

    public OptionGroupView createGroup(OptionGroupRequest req) {
        OptionGroup g = new OptionGroup(req.name().trim(), req.selectionType(), req.isRequired(),
                maxSelectFor(req), req.sortOrder());
        g.setNeedsIcedDrink(req.needsIcedDrink());
        g.setSummaryNoun(Text.blankToNull(req.summaryNoun()));
        return OptionGroupView.of(groups.save(g));
    }

    public OptionGroupView updateGroup(long id, OptionGroupRequest req) {
        OptionGroup g = group(id);
        g.setName(req.name().trim());
        g.setSelectionType(req.selectionType());
        g.setRequired(req.isRequired());
        g.setMaxSelect(maxSelectFor(req));
        g.setSortOrder(req.sortOrder());
        g.setNeedsIcedDrink(req.needsIcedDrink());
        g.setSummaryNoun(Text.blankToNull(req.summaryNoun()));
        return OptionGroupView.of(g);
    }

    /** Single-choice groups always allow exactly one (data dictionary: max_select). */
    private static int maxSelectFor(OptionGroupRequest req) {
        return req.selectionType() == SelectionType.SINGLE ? 1 : req.maxSelect();
    }

    public OptionView addOption(long groupId, OptionRequest req) {
        OptionGroup g = group(groupId);
        MenuOption o = new MenuOption(g, req.name().trim(), money(req.extraPrice()), req.sortOrder());
        o.setIced(req.isIced());
        if (req.isActive() != null) o.setActive(req.isActive());
        g.getOptions().add(o);
        return OptionView.of(options.save(o));
    }

    public OptionView updateOption(long optionId, OptionRequest req) {
        MenuOption o = options.findById(optionId).orElseThrow(() -> ApiException.notFound("Option"));
        o.setName(req.name().trim());
        o.setExtraPrice(money(req.extraPrice()));
        o.setSortOrder(req.sortOrder());
        o.setIced(req.isIced());
        if (req.isActive() != null) o.setActive(req.isActive());
        return OptionView.of(o);
    }

    // ---- one drink ----

    @Transactional(readOnly = true)
    public ProductOptionsView productOptions(long productId) {
        Product product = product(productId);
        Map<Long, ProductOptionGroup> offeredGroups = productGroups.findForProduct(productId).stream()
                .collect(Collectors.toMap(pog -> pog.getGroup().getId(), Function.identity()));
        Map<Long, ProductOption> offeredOptions = productOptions.findForProduct(productId).stream()
                .collect(Collectors.toMap(po -> po.getOption().getId(), Function.identity()));

        List<ProductGroupSetting> settings = groups.findAllByOrderBySortOrderAscIdAsc().stream().map(g -> {
            ProductOptionGroup pog = offeredGroups.get(g.getId());
            List<ProductOptionSetting> opts = g.getOptions().stream().map(o -> {
                ProductOption po = offeredOptions.get(o.getId());
                return new ProductOptionSetting(o.getId(), o.getName(), o.getExtraPrice(), po != null,
                        po == null ? null : po.getExtraPrice(), o.isActive());
            }).toList();
            return new ProductGroupSetting(g.getId(), g.getName(), g.getSelectionType(), g.isRequired(),
                    g.getMaxSelect(), pog != null, pog == null || pog.isActive(),
                    pog == null || pog.getDefaultOption() == null ? null : pog.getDefaultOption().getId(), opts);
        }).toList();
        return new ProductOptionsView(productId, product.getName(), settings);
    }

    /**
     * Replaces what the drink offers. Each group must offer at least one
     * option, and its default must be one of them.
     */
    public ProductOptionsView saveProductOptions(long productId, ProductOptionsRequest req) {
        Product product = product(productId);
        Map<Long, OptionGroup> allGroups = groups.findAll().stream()
                .collect(Collectors.toMap(OptionGroup::getId, Function.identity()));
        Set<Long> seenGroups = new HashSet<>();

        productOptions.deleteByProductId(productId);
        productGroups.deleteByProductId(productId);
        productOptions.flush();
        productGroups.flush();

        for (ProductGroupChoice choice : req.groups() == null ? List.<ProductGroupChoice>of() : req.groups()) {
            OptionGroup g = allGroups.get(choice.groupId());
            if (g == null || !seenGroups.add(g.getId())) {
                throw ApiException.badRequest("bad_group", "Unknown or repeated option group.");
            }
            List<ProductOptionChoice> chosen = choice.options() == null ? List.of() : choice.options();
            if (chosen.isEmpty()) {
                throw ApiException.badRequest("empty_group", g.getName() + ": offer at least one option.");
            }
            Map<Long, MenuOption> groupOptions = g.getOptions().stream()
                    .collect(Collectors.toMap(MenuOption::getId, Function.identity()));
            MenuOption defaultOption = null;
            if (choice.defaultOptionId() != null) {
                boolean offered = chosen.stream().anyMatch(c -> c.optionId() == choice.defaultOptionId());
                defaultOption = groupOptions.get(choice.defaultOptionId());
                if (!offered || defaultOption == null) {
                    throw ApiException.badRequest("bad_default", g.getName() + ": the default must be an offered option.");
                }
            }
            ProductOptionGroup pog = new ProductOptionGroup(product, g, defaultOption);
            pog.setActive(choice.isActive());
            productGroups.save(pog);
            for (ProductOptionChoice c : chosen) {
                MenuOption o = groupOptions.get(c.optionId());
                if (o == null) throw ApiException.badRequest("bad_option", g.getName() + ": unknown option.");
                productOptions.save(new ProductOption(product, o, c.priceOverride() == null ? null : money(c.priceOverride())));
            }
        }
        return productOptions(productId);
    }

    private OptionGroup group(long id) {
        return groups.findById(id).orElseThrow(() -> ApiException.notFound("Option group"));
    }

    private Product product(long id) {
        return products.findById(id).orElseThrow(() -> ApiException.notFound("Drink"));
    }

    private static BigDecimal money(BigDecimal v) {
        return v.setScale(2, RoundingMode.HALF_UP);
    }
}
