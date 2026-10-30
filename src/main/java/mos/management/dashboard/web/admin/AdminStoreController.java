package mos.management.dashboard.web.admin;

import jakarta.validation.Valid;
import mos.management.dashboard.dto.StoreDtos.HoursRequest;
import mos.management.dashboard.dto.StoreDtos.OnlineOrderingRequest;
import mos.management.dashboard.dto.StoreDtos.SettingsRequest;
import mos.management.dashboard.dto.StoreDtos.StoreInfoView;
import mos.management.dashboard.service.store.StoreService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Store settings: admins (FR-36, 37, 40); pausing online orders: staff too (FR-41). */
@RestController
@RequestMapping("/api/admin/store")
public class AdminStoreController {

    private final StoreService store;

    public AdminStoreController(StoreService store) {
        this.store = store;
    }

    @GetMapping
    public StoreInfoView info() {
        return store.info();
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public StoreInfoView updateSettings(@Valid @RequestBody SettingsRequest body) {
        return store.updateSettings(body);
    }

    @PutMapping("/hours")
    @PreAuthorize("hasRole('ADMIN')")
    public StoreInfoView updateHours(@Valid @RequestBody HoursRequest body) {
        return store.updateHours(body);
    }

    @PutMapping("/online-ordering")
    public StoreInfoView setOnlineOrdering(@RequestBody OnlineOrderingRequest body) {
        return store.setOnlineOrdering(body.open());
    }
}
