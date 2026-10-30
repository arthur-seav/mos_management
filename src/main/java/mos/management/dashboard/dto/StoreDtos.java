package mos.management.dashboard.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import mos.management.dashboard.entity.OpeningHours;
import mos.management.dashboard.entity.StoreSettings;

import java.time.LocalTime;
import java.util.List;

/** Store info, opening hours and pickup rules (FR-36, FR-37, FR-40, FR-41). */
public final class StoreDtos {

    private StoreDtos() {
    }

    public record SettingsView(String storeName, String address, String phone, int slotIntervalMin, int minPrepMin,
                               int pickupTimeoutMin, int asapPrepMin, boolean onlineOrderingOpen) {
        public static SettingsView of(StoreSettings s) {
            return new SettingsView(s.getStoreName(), s.getAddress(), s.getPhone(), s.getSlotIntervalMin(),
                    s.getMinPrepMin(), s.getPickupTimeoutMin(), s.getAsapPrepMin(), s.isOnlineOrderingOpen());
        }
    }

    /** Times are store-local "HH:mm". dayOfWeek 0 = Sunday, as in the data dictionary. */
    public record DayHoursView(int dayOfWeek, LocalTime openTime, LocalTime closeTime, boolean isClosed) {
        public static DayHoursView of(OpeningHours h) {
            return new DayHoursView(h.getDayOfWeek(), h.getOpenTime(), h.getCloseTime(), h.isClosed());
        }
    }

    public record StoreInfoView(SettingsView settings, List<DayHoursView> hours, String timeZone, boolean isOpenNow) {
    }

    public record SettingsRequest(@NotBlank(message = "Enter the store name.") @Size(max = 100) String storeName,
                                  @NotBlank(message = "Enter the address.") @Size(max = 255) String address,
                                  @NotBlank(message = "Enter the phone number.") @Size(max = 20) String phone,
                                  @Min(value = 5, message = "Slots are at least 5 minutes apart.") @Max(120) int slotIntervalMin,
                                  @Min(0) @Max(240) int minPrepMin,
                                  @Min(5) @Max(240) int pickupTimeoutMin,
                                  @Min(0) @Max(120) int asapPrepMin) {
    }

    public record DayHoursRequest(@Min(0) @Max(6) int dayOfWeek, LocalTime openTime, LocalTime closeTime,
                                  boolean isClosed) {
    }

    public record HoursRequest(@NotNull @Size(min = 7, max = 7, message = "Send all seven days.") @Valid List<DayHoursRequest> days) {
    }

    public record OnlineOrderingRequest(boolean open) {
    }
}
