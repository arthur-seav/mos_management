package mos.management.dashboard.web.admin;

import jakarta.validation.Valid;
import mos.management.dashboard.dto.MenuDtos.ActiveRequest;
import mos.management.dashboard.dto.MenuDtos.AvailabilityRequest;
import mos.management.dashboard.dto.MenuDtos.CategoryRequest;
import mos.management.dashboard.dto.MenuDtos.CategoryView;
import mos.management.dashboard.dto.MenuDtos.CustomizationView;
import mos.management.dashboard.dto.MenuDtos.OptionGroupRequest;
import mos.management.dashboard.dto.MenuDtos.OptionGroupView;
import mos.management.dashboard.dto.MenuDtos.OptionRequest;
import mos.management.dashboard.dto.MenuDtos.OptionView;
import mos.management.dashboard.dto.MenuDtos.ProductOptionsRequest;
import mos.management.dashboard.dto.MenuDtos.ProductOptionsView;
import mos.management.dashboard.dto.MenuDtos.ProductRequest;
import mos.management.dashboard.dto.MenuDtos.ProductView;
import mos.management.dashboard.service.menu.MenuAdminService;
import mos.management.dashboard.service.menu.MenuQueryService;
import mos.management.dashboard.service.menu.OptionAdminService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Menu on the dashboard. Staff may read it and switch drinks sold out
 * (SA 1.5 "Product status and Search"); everything else is admin only.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminMenuController {

    private final MenuAdminService menu;
    private final OptionAdminService options;
    private final MenuQueryService query;

    public AdminMenuController(MenuAdminService menu, OptionAdminService options, MenuQueryService query) {
        this.menu = menu;
        this.options = options;
        this.query = query;
    }

    @GetMapping("/categories")
    public List<CategoryView> categories() {
        return menu.categories();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryView createCategory(@Valid @RequestBody CategoryRequest body) {
        return menu.createCategory(body);
    }

    @PutMapping("/categories/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryView updateCategory(@PathVariable long id, @Valid @RequestBody CategoryRequest body) {
        return menu.updateCategory(id, body);
    }

    @GetMapping("/products")
    public List<ProductView> products() {
        return menu.products();
    }

    @GetMapping("/products/{id}")
    public ProductView product(@PathVariable long id) {
        return menu.product(id);
    }

    @PostMapping("/products")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ProductView createProduct(@Valid @RequestBody ProductRequest body) {
        return menu.createProduct(body);
    }

    @PutMapping("/products/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductView updateProduct(@PathVariable long id, @Valid @RequestBody ProductRequest body) {
        return menu.updateProduct(id, body);
    }

    /** FR-22: staff and admins. */
    @PatchMapping("/products/{id}/availability")
    public ProductView setAvailability(@PathVariable long id, @RequestBody AvailabilityRequest body) {
        return menu.setAvailable(id, body.isAvailable());
    }

    @PatchMapping("/products/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductView setActive(@PathVariable long id, @RequestBody ActiveRequest body) {
        return menu.setActive(id, body.isActive());
    }

    @PostMapping("/products/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductView uploadImage(@PathVariable long id, @RequestParam("file") MultipartFile file) {
        return menu.uploadImage(id, file);
    }

    /** What a staff member picks from when taking a walk-in order. */
    @GetMapping("/products/{id}/customization")
    public CustomizationView customization(@PathVariable long id) {
        return query.customization(id);
    }

    @GetMapping("/products/{id}/options")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductOptionsView productOptions(@PathVariable long id) {
        return options.productOptions(id);
    }

    @PutMapping("/products/{id}/options")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductOptionsView saveProductOptions(@PathVariable long id, @Valid @RequestBody ProductOptionsRequest body) {
        return options.saveProductOptions(id, body);
    }

    @GetMapping("/option-groups")
    @PreAuthorize("hasRole('ADMIN')")
    public List<OptionGroupView> optionGroups() {
        return options.groups();
    }

    @PostMapping("/option-groups")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public OptionGroupView createGroup(@Valid @RequestBody OptionGroupRequest body) {
        return options.createGroup(body);
    }

    @PutMapping("/option-groups/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public OptionGroupView updateGroup(@PathVariable long id, @Valid @RequestBody OptionGroupRequest body) {
        return options.updateGroup(id, body);
    }

    @PostMapping("/option-groups/{id}/options")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public OptionView addOption(@PathVariable long id, @Valid @RequestBody OptionRequest body) {
        return options.addOption(id, body);
    }

    @PutMapping("/options/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public OptionView updateOption(@PathVariable long id, @Valid @RequestBody OptionRequest body) {
        return options.updateOption(id, body);
    }
}
