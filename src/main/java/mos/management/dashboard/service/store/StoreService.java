package mos.management.dashboard.service.store;

import mos.management.dashboard.config.MosProperties;
import mos.management.dashboard.dto.StoreDtos.DayHoursRequest;
import mos.management.dashboard.dto.StoreDtos.DayHoursView;
import mos.management.dashboard.dto.StoreDtos.HoursRequest;
import mos.management.dashboard.dto.StoreDtos.SettingsRequest;
import mos.management.dashboard.dto.StoreDtos.SettingsView;
import mos.management.dashboard.dto.StoreDtos.StoreInfoView;
import mos.management.dashboard.entity.OpeningHours;
import mos.management.dashboard.entity.StoreSettings;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.OpeningHoursRepository;
import mos.management.dashboard.repository.StoreSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;

/** Store info (FR-36), opening hours (FR-37), pickup rules (FR-40), pause (FR-41). */
@Service
@Transactional
public class StoreService {

    private final StoreSettingsRepository settings;
    private final OpeningHoursRepository hours;
    private final ZoneId zone;
    private final Clock clock;

    public StoreService(StoreSettingsRepository settings, OpeningHoursRepository hours, MosProperties properties,
                        Clock clock) {
        this.settings = settings;
        this.hours = hours;
        this.zone = properties.store().zone();
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public StoreInfoView info() {
        return new StoreInfoView(SettingsView.of(settings.current()),
                hours.findAllByOrderByDayOfWeekAsc().stream().map(DayHoursView::of).toList(),
                zone.getId(), rules().isOpenNow());
    }

    @Transactional(readOnly = true)
    public PickupRules rules() {
        return new PickupRules(settings.current(), hours.findAllByOrderByDayOfWeekAsc(), zone, clock.instant());
    }

    @Transactional(readOnly = true)
    public StoreSettings current() {
        return settings.current();
    }

    public ZoneId zone() {
        return zone;
    }

    public StoreInfoView updateSettings(SettingsRequest req) {
        StoreSettings s = settings.current();
        s.setStoreName(req.storeName().trim());
        s.setAddress(req.address().trim());
        s.setPhone(req.phone().trim());
        s.setSlotIntervalMin(req.slotIntervalMin());
        s.setMinPrepMin(req.minPrepMin());
        s.setPickupTimeoutMin(req.pickupTimeoutMin());
        s.setAsapPrepMin(req.asapPrepMin());
        return info();
    }

    public StoreInfoView updateHours(HoursRequest req) {
        Set<Integer> days = new HashSet<>();
        for (DayHoursRequest d : req.days()) {
            if (!days.add(d.dayOfWeek())) throw ApiException.badRequest("bad_hours", "Each day once, please.");
            if (!d.isClosed() && (d.openTime() == null || d.closeTime() == null || !d.openTime().isBefore(d.closeTime()))) {
                throw ApiException.badRequest("bad_hours", "Opening time must be before closing time.");
            }
        }
        for (DayHoursRequest d : req.days()) {
            OpeningHours h = hours.findById((short) d.dayOfWeek()).orElseThrow();
            h.setHours(d.isClosed(), d.openTime(), d.closeTime());
        }
        hours.flush();
        return info();
    }

    /** FR-41: paused = the app shows it and refuses new orders; placed orders carry on (BR-14). */
    public StoreInfoView setOnlineOrdering(boolean open) {
        settings.current().setOnlineOrderingOpen(open);
        return info();
    }
}
