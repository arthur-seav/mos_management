package mos.management.dashboard.repository;

import mos.management.dashboard.entity.StoreSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoreSettingsRepository extends JpaRepository<StoreSettings, Short> {

    default StoreSettings current() {
        return findById(StoreSettings.ID).orElseThrow(() -> new IllegalStateException("store_settings row missing"));
    }
}
