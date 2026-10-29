package mos.management.dashboard.service.store;

import mos.management.dashboard.entity.OpeningHours;
import mos.management.dashboard.entity.StoreSettings;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** BR-07 without a database. Thursday 29 Oct 2026 in Phnom Penh (UTC+7). */
class PickupRulesTest {

    static final ZoneId PP = ZoneId.of("Asia/Phnom_Penh");

    static Instant local(String time) {
        return Instant.parse("2026-10-29T" + time + ":00Z").minusSeconds(7 * 3600);   // local -> UTC
    }

    static PickupRules rules(String now, String open, String close, int minPrep) throws Exception {
        StoreSettings s = newInstance(StoreSettings.class);
        s.setMinPrepMin(minPrep);
        s.setAsapPrepMin(10);
        List<OpeningHours> hours = new ArrayList<>();
        for (int d = 0; d < 7; d++) {
            OpeningHours h = newInstance(OpeningHours.class);
            Field f = OpeningHours.class.getDeclaredField("dayOfWeek");
            f.setAccessible(true);
            f.set(h, (short) d);
            h.setHours(false, LocalTime.parse(open), LocalTime.parse(close));
            hours.add(h);
        }
        return new PickupRules(s, hours, PP, local(now));
    }

    static <T> T newInstance(Class<T> type) throws Exception {
        Constructor<T> c = type.getDeclaredConstructor();
        c.setAccessible(true);
        return c.newInstance();
    }

    @Test
    void slotsAfterAnHourBeforeClosingAreRefused() throws Exception {   // TC-19: closes 21:00
        PickupRules r = rules("17:00", "07:00", "21:00", 30);
        assertThat(r.allows(local("20:00"))).isTrue();
        assertThat(r.allows(local("20:01"))).isFalse();
    }

    @Test
    void aSlotNeedsTheMinimumPrepTime() throws Exception {   // BR-07: 30 min
        PickupRules r = rules("10:00", "07:00", "21:00", 30);
        assertThat(r.allows(local("10:29"))).isFalse();
        assertThat(r.allows(local("10:30"))).isTrue();
    }

    @Test
    void nothingBeforeOpeningAndAsapOnlyWhileOpen() throws Exception {
        PickupRules early = rules("06:00", "07:00", "21:00", 30);
        assertThat(early.allows(local("06:45"))).isFalse();
        assertThat(early.allows(local("07:00"))).isTrue();
        assertThat(early.canPickUpAsap()).isFalse();
        assertThat(rules("12:00", "07:00", "21:00", 30).canPickUpAsap()).isTrue();
        assertThat(rules("20:55", "07:00", "21:00", 30).canPickUpAsap()).isFalse();   // not ready before closing
    }
}
