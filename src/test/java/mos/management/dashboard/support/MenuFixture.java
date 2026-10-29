package mos.management.dashboard.support;

import mos.management.dashboard.entity.Category;
import mos.management.dashboard.entity.MenuOption;
import mos.management.dashboard.entity.OptionGroup;
import mos.management.dashboard.entity.Product;
import mos.management.dashboard.entity.ProductOption;
import mos.management.dashboard.entity.ProductOptionGroup;
import mos.management.dashboard.entity.SelectionType;
import mos.management.dashboard.repository.CategoryRepository;
import mos.management.dashboard.repository.MenuOptionRepository;
import mos.management.dashboard.repository.OptionGroupRepository;
import mos.management.dashboard.repository.ProductOptionGroupRepository;
import mos.management.dashboard.repository.ProductOptionRepository;
import mos.management.dashboard.repository.ProductRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * A small menu from the SA test cases: Latte $3.00 with its own Large
 * +$1.00 (TC-14), Americano $2.50 with Large +$0.50 (TC-15), Espresso
 * hot only (TC-10), Mocha (TC-09), oat milk +$0.60 and three more add-ons
 * (TC-13).
 */
@Component
public class MenuFixture {

    public Category coffee;
    public Product latte, americano, espresso, mocha;
    public OptionGroup size, temperature, ice, sweetness, addOns;
    public MenuOption small, medium, large, hot, iced, lessIce, regularIce, noSugar, regularSugar,
            oatMilk, extraShot, vanilla, caramel;

    private final CategoryRepository categories;
    private final ProductRepository products;
    private final OptionGroupRepository groups;
    private final MenuOptionRepository options;
    private final ProductOptionGroupRepository productGroups;
    private final ProductOptionRepository productOptions;

    public MenuFixture(CategoryRepository categories, ProductRepository products, OptionGroupRepository groups,
                       MenuOptionRepository options, ProductOptionGroupRepository productGroups,
                       ProductOptionRepository productOptions) {
        this.categories = categories;
        this.products = products;
        this.groups = groups;
        this.options = options;
        this.productGroups = productGroups;
        this.productOptions = productOptions;
    }

    public MenuFixture build() {
        Instant t = Instant.parse("2026-10-01T00:00:00Z");
        coffee = categories.save(new Category("Coffee", 1));
        latte = products.save(new Product(coffee, "Latte", "Espresso with steamed milk", money("3.00"), t));
        americano = products.save(new Product(coffee, "Americano", "Espresso and hot water", money("2.50"), t));
        espresso = products.save(new Product(coffee, "Espresso", "Double shot", money("2.00"), t));
        mocha = products.save(new Product(coffee, "Mocha", "Espresso and chocolate", money("3.60"), t));

        size = groups.save(new OptionGroup("Size", SelectionType.SINGLE, true, 1, 1));
        temperature = groups.save(new OptionGroup("Temperature", SelectionType.SINGLE, true, 1, 2));
        ice = new OptionGroup("Ice level", SelectionType.SINGLE, true, 1, 3);
        ice.setNeedsIcedDrink(true);
        ice.setSummaryNoun("ice");
        ice = groups.save(ice);
        sweetness = new OptionGroup("Sweetness", SelectionType.SINGLE, true, 1, 4);
        sweetness.setSummaryNoun("sugar");
        sweetness = groups.save(sweetness);
        addOns = groups.save(new OptionGroup("Add-ons", SelectionType.MULTIPLE, false, 3, 5));

        small = option(size, "Small", "0.00", 1);
        medium = option(size, "Medium", "0.50", 2);
        large = option(size, "Large", "0.75", 3);
        hot = option(temperature, "Hot", "0", 1);
        iced = option(temperature, "Iced", "0", 2);
        iced.setIced(true);
        options.save(iced);
        lessIce = option(ice, "Less", "0", 1);
        regularIce = option(ice, "Regular", "0", 2);
        noSugar = option(sweetness, "No sugar", "0", 1);
        regularSugar = option(sweetness, "Regular", "0", 2);
        oatMilk = option(addOns, "Oat milk", "0.60", 1);
        extraShot = option(addOns, "Extra shot", "0.50", 2);
        vanilla = option(addOns, "Vanilla syrup", "0.40", 3);
        caramel = option(addOns, "Caramel drizzle", "0.30", 4);

        // Latte: hot or iced, Large +$1.00 for this drink (TC-14).
        offer(latte, size, medium, small, null, medium, null, large, "1.00");
        offer(latte, temperature, hot, hot, null, iced, null);
        offer(latte, ice, regularIce, lessIce, null, regularIce, null);
        offer(latte, sweetness, regularSugar, noSugar, null, regularSugar, null);
        offer(latte, addOns, null, oatMilk, null, extraShot, null, vanilla, null, caramel, null);
        // Americano: Large +$0.50 for this drink (TC-15).
        offer(americano, size, medium, small, null, medium, "0.25", large, "0.50");
        offer(americano, temperature, hot, hot, null, iced, null);
        offer(americano, ice, regularIce, lessIce, null, regularIce, null);
        offer(americano, sweetness, noSugar, noSugar, null, regularSugar, null);
        // Espresso: hot only, so no ice level (TC-10).
        offer(espresso, temperature, hot, hot, null);
        offer(espresso, sweetness, noSugar, noSugar, null, regularSugar, null);
        // Mocha: size only.
        offer(mocha, size, medium, small, null, medium, null, large, null);
        return this;
    }

    private MenuOption option(OptionGroup g, String name, String price, int sort) {
        MenuOption o = options.save(new MenuOption(g, name, money(price), sort));
        g.getOptions().add(o);
        return o;
    }

    /** pairs: option, price override (null = the option's price). */
    private void offer(Product p, OptionGroup g, MenuOption def, Object... pairs) {
        productGroups.save(new ProductOptionGroup(p, g, def));
        for (int i = 0; i < pairs.length; i += 2) {
            String price = (String) pairs[i + 1];
            productOptions.save(new ProductOption(p, (MenuOption) pairs[i], price == null ? null : money(price)));
        }
    }

    public static BigDecimal money(String v) {
        return new BigDecimal(v).setScale(2);
    }
}
