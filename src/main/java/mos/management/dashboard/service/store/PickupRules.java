package mos.management.dashboard.service.store;

import mos.management.dashboard.entity.OpeningHours;
import mos.management.dashboard.entity.StoreSettings;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

/**
 * BR-07 for one moment, the same rule as the app's PickupSchedule: a
 * scheduled slot must be at least min_prep_min after now, within today's
 * opening hours, and no later than 60 minutes before closing. ASAP needs
 * the store open and the drink ready before it closes.
 */
public final class PickupRules {

    public static final Duration LAST_SLOT_BEFORE_CLOSE = Duration.ofMinutes(60);

    private final StoreSettings settings;
    private final List<OpeningHours> hours;
    private final ZoneId zone;
    private final Instant now;

    public PickupRules(StoreSettings settings, List<OpeningHours> hours, ZoneId zone, Instant now) {
        this.settings = settings;
        this.hours = hours;
        this.zone = zone;
        this.now = now;
    }

    private Optional<OpeningHours> today() {
        int day = now.atZone(zone).getDayOfWeek().getValue() % 7;   // Monday 1 ... Sunday 7 -> 0
        return hours.stream().filter(h -> h.getDayOfWeek() == day && h.isOpenDay()).findFirst();
    }

    private Instant at(java.time.LocalTime time) {
        LocalDate date = now.atZone(zone).toLocalDate();
        return ZonedDateTime.of(date, time, zone).toInstant();
    }

    public Optional<Instant> opensAt() {
        return today().map(h -> at(h.getOpenTime()));
    }

    public Optional<Instant> closesAt() {
        return today().map(h -> at(h.getCloseTime()));
    }

    public boolean isOpenNow() {
        return opensAt().isPresent() && !now.isBefore(opensAt().get()) && now.isBefore(closesAt().get());
    }

    public boolean canPickUpAsap() {
        return isOpenNow() && now.plus(Duration.ofMinutes(settings.getAsapPrepMin())).isBefore(closesAt().get());
    }

    public Instant earliestSlot() {
        return now.plus(Duration.ofMinutes(settings.getMinPrepMin()));
    }

    public Optional<Instant> latestSlot() {
        return closesAt().map(c -> c.minus(LAST_SLOT_BEFORE_CLOSE));
    }

    /** BR-07 for one time (TC-19). */
    public boolean allows(Instant time) {
        if (opensAt().isEmpty()) return false;
        return !time.isBefore(earliestSlot()) && !time.isBefore(opensAt().get()) && !time.isAfter(latestSlot().get());
    }
}
