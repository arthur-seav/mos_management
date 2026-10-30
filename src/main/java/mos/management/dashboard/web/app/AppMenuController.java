package mos.management.dashboard.web.app;

import mos.management.dashboard.dto.MenuDtos.CustomizationView;
import mos.management.dashboard.dto.MenuDtos.MenuView;
import mos.management.dashboard.dto.MenuDtos.ProductView;
import mos.management.dashboard.dto.StoreDtos.StoreInfoView;
import mos.management.dashboard.service.menu.MenuQueryService;
import mos.management.dashboard.service.report.ReportService;
import mos.management.dashboard.service.store.StoreService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

/** What guests and customers browse without signing in (FR-01, FR-06 to FR-08). */
@RestController
@RequestMapping("/api/app")
public class AppMenuController {

    private final MenuQueryService menu;
    private final StoreService store;
    private final ReportService reports;

    public AppMenuController(MenuQueryService menu, StoreService store, ReportService reports) {
        this.menu = menu;
        this.store = store;
        this.reports = reports;
    }

    @GetMapping("/menu")
    public MenuView menu() {
        return menu.menu();
    }

    /** "Popular now" on Home: best sellers of the last 30 days (FR-35 data), then the menu order. */
    @GetMapping("/menu/popular")
    public List<ProductView> popular(@RequestParam(defaultValue = "6") int limit) {
        return reports.popular(limit).stream().map(ProductView::of).toList();
    }

    @GetMapping("/menu/products/{id}/customization")
    public CustomizationView customization(@PathVariable long id) {
        return menu.customization(id);
    }

    public record UnavailableRequest(List<Long> productIds) {
    }

    public record UnavailableView(Set<Long> productIds) {
    }

    /** BR-05: checked before checkout (TC-17). */
    @PostMapping("/menu/unavailable")
    public UnavailableView unavailable(@RequestBody UnavailableRequest body) {
        return new UnavailableView(menu.unavailable(body.productIds() == null ? List.of() : body.productIds()));
    }

    /** Read before every checkout, so a pause shows at once (TC-20). */
    @GetMapping("/store")
    public StoreInfoView store() {
        return store.info();
    }
}
