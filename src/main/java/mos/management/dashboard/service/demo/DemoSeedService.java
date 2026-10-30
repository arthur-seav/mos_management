package mos.management.dashboard.service.demo;

import mos.management.dashboard.dto.AccountDtos.StaffRequest;
import mos.management.dashboard.dto.MenuDtos.*;
import mos.management.dashboard.entity.SelectionType;
import mos.management.dashboard.entity.UserRole;
import mos.management.dashboard.repository.CategoryRepository;
import mos.management.dashboard.repository.UserRepository;
import mos.management.dashboard.service.account.AccountService;
import mos.management.dashboard.service.menu.MenuAdminService;
import mos.management.dashboard.service.menu.OptionAdminService;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.*;

/** Explicit fresh-database demo bootstrap. Uses the same services as dashboard writes. */
@Service
public class DemoSeedService {
    private final UserRepository users;
    private final CategoryRepository categories;
    private final AccountService accounts;
    private final MenuAdminService menu;
    private final OptionAdminService options;
    private final ObjectMapper mapper;

    public DemoSeedService(UserRepository users, CategoryRepository categories, AccountService accounts,
                           MenuAdminService menu, OptionAdminService options, ObjectMapper mapper) {
        this.users = users; this.categories = categories; this.accounts = accounts;
        this.menu = menu; this.options = options; this.mapper = mapper;
    }

    /** {@code image}: a file in classpath:/demo/images/, served at {@link #IMAGE_PATH}. */
    public record DemoProduct(String name, String category, BigDecimal price, String description,
                              boolean soldOut, boolean inactive, String image) {}
    public record Catalog(List<String> categories, List<DemoProduct> products) {}

    /** URL prefix of the bundled demo photos (WebConfig maps it to classpath:/demo/images/). */
    public static final String IMAGE_PATH = "/demo-images/";
    static final String ADMIN_EMAIL = "admin@mos.test";
    static final String STAFF_EMAIL = "staff@mos.test";

    /**
     * Adds the demo menu to a database that has no menu yet, plus each demo account that does not exist.
     * Existing accounts (and their passwords) are never touched; a database that already has a menu is refused.
     */
    @Transactional
    public void seed(String adminPassword, String staffPassword) {
        if (categories.count() != 0) {
            throw new IllegalStateException("Demo seed needs a database without a menu; this one already has a menu, so nothing was changed.");
        }
        boolean needAdmin = users.findByEmailIgnoreCase(ADMIN_EMAIL).isEmpty();
        boolean needStaff = users.findByEmailIgnoreCase(STAFF_EMAIL).isEmpty();
        // Validate before any writes. Passwords are supplied at runtime, never logged.
        if (needAdmin && !strong(adminPassword)) {
            throw new IllegalArgumentException("Set MOS_DEMO_ADMIN_PASSWORD (8+ characters) to create the demo admin.");
        }
        if (needStaff && !strong(staffPassword)) {
            throw new IllegalArgumentException("Set MOS_DEMO_STAFF_PASSWORD (8+ characters) to create the demo staff account.");
        }
        Catalog catalog;
        try (var in = new ClassPathResource("demo/menu.json").getInputStream()) {
            catalog = mapper.readValue(in, Catalog.class);
        } catch (Exception e) {
            throw new IllegalStateException("Could not read demo/menu.json", e);
        }
        for (DemoProduct d : catalog.products()) {
            if (d.image() == null || !new ClassPathResource("demo/images/" + d.image()).exists()) {
                throw new IllegalStateException("Missing demo photo for " + d.name() + ": demo/images/" + d.image());
            }
        }
        if (needAdmin) accounts.createStaff(new StaffRequest("Vanna", "Chea", ADMIN_EMAIL, null, UserRole.ADMIN, adminPassword));
        if (needStaff) accounts.createStaff(new StaffRequest("Sophea", "Lim", STAFF_EMAIL, null, UserRole.STAFF, staffPassword));
        Map<String, Long> categoryIds = new LinkedHashMap<>();
        for (String name : catalog.categories()) {
            categoryIds.put(name, menu.createCategory(new CategoryRequest(name, categoryIds.size() + 1, true)).id());
        }
        Map<String, OptionGroupView> groups = new LinkedHashMap<>();
        Map<String, Long> optionIds = new HashMap<>();
        addGroup(groups, optionIds, "Size", true, null, false,
                new String[]{"Small", "Medium", "Large"}, new String[]{"0", "0.50", "1.00"});
        addGroup(groups, optionIds, "Temperature", true, null, false,
                new String[]{"Hot", "Iced"}, new String[]{"0", "0"});
        addGroup(groups, optionIds, "Ice level", true, "ice", true,
                new String[]{"No ice", "Less", "Regular", "Extra"}, new String[]{"0", "0", "0", "0"});
        addGroup(groups, optionIds, "Sweetness", true, "sugar", false,
                new String[]{"No sugar", "Less", "Regular", "Extra"}, new String[]{"0", "0", "0", "0"});
        addGroup(groups, optionIds, "Add-ons", false, null, false,
                new String[]{"Oat milk", "Extra shot", "Vanilla syrup", "Caramel drizzle", "Whipped cream"},
                new String[]{"0.60", "0.50", "0.40", "0.30", "0.40"});
        addGroup(groups, optionIds, "Shots", true, "shot", false,
                new String[]{"Single", "Double", "Triple"}, new String[]{"-0.50", "0", "0.50"});
        // Re-read group DTOs after adding options (the create response precedes them).
        options.groups().forEach(g -> groups.put(g.name(), g));
        for (DemoProduct d : catalog.products()) {
            ProductView p = menu.createProduct(new ProductRequest(categoryIds.get(d.category()), d.name(), d.description(),
                    IMAGE_PATH + d.image(), d.price(), !d.inactive()));
            if (d.soldOut()) menu.setAvailable(p.id(), false);
            boolean espresso = d.name().equals("Espresso");
            boolean coldOnly = Set.of("Caramel Frappé", "Mocha Frappé", "Matcha Frappé", "Strawberry Milk", "Lemon Soda").contains(d.name());
            boolean icedDefault = Set.of("Caramel Latte", "Thai Milk Tea", "Matcha Latte").contains(d.name());
            List<ProductGroupChoice> choices = new ArrayList<>();
            if (espresso) {
                choices.add(offer(groups.get("Shots"), "Double", optionIds, null, Map.of()));
            } else {
                Map<String, BigDecimal> prices = d.name().equals("Americano")
                        ? Map.of("Medium", new BigDecimal("0.25"), "Large", new BigDecimal("0.50")) : Map.of();
                choices.add(offer(groups.get("Size"), "Medium", optionIds, null, prices));
            }
            if (!coldOnly) choices.add(offer(groups.get("Temperature"), icedDefault ? "Iced" : "Hot", optionIds,
                    espresso ? Set.of("Hot") : null, Map.of()));
            if (!espresso) choices.add(offer(groups.get("Ice level"), d.name().equals("Caramel Latte") ? "Less" : "Regular", optionIds, null, Map.of()));
            choices.add(offer(groups.get("Sweetness"), espresso || d.name().equals("Americano") ? "No sugar" : "Regular", optionIds, null, Map.of()));
            choices.add(offer(groups.get("Add-ons"), null, optionIds, null, Map.of()));
            options.saveProductOptions(p.id(), new ProductOptionsRequest(choices));
        }
    }

    private static boolean strong(String password) {
        return password != null && password.length() >= 8;
    }

    private void addGroup(Map<String, OptionGroupView> groups, Map<String, Long> ids, String name,
                          boolean required, String noun, boolean needsIce, String[] names, String[] prices) {
        boolean multiple = name.equals("Add-ons");
        var group = options.createGroup(new OptionGroupRequest(name, multiple ? SelectionType.MULTIPLE : SelectionType.SINGLE,
                required, multiple ? 3 : 1, groups.size() + 1, needsIce, noun));
        groups.put(name, group);
        for (int i = 0; i < names.length; i++) {
            var option = options.addOption(group.id(), new OptionRequest(names[i], new BigDecimal(prices[i]), i + 1,
                    name.equals("Temperature") && names[i].equals("Iced"), true));
            ids.put(name + "/" + names[i], option.id());
        }
    }

    private ProductGroupChoice offer(OptionGroupView group, String defaultName, Map<String, Long> ids,
                                     Set<String> only, Map<String, BigDecimal> prices) {
        return new ProductGroupChoice(group.id(), true, defaultName == null ? null : ids.get(group.name() + "/" + defaultName),
                group.options().stream().filter(o -> only == null || only.contains(o.name()))
                        .map(o -> new ProductOptionChoice(o.id(), prices.get(o.name()))).toList());
    }
}
