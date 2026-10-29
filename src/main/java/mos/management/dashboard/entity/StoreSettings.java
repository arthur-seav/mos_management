package mos.management.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** store_settings: one row (setting_id = 1). FR-36, FR-40, FR-41. */
@Entity
@Table(name = "store_settings")
public class StoreSettings {

    public static final short ID = 1;

    @Id
    @Column(name = "setting_id")
    private Short id;

    private String storeName;
    private String address;
    private String phone;
    private short slotIntervalMin;
    private short minPrepMin;
    private short pickupTimeoutMin;
    private boolean onlineOrderingOpen;

    /** "Ready in about 10 min" for ASAP orders. Not in SA. */
    private short asapPrepMin;

    protected StoreSettings() {
    }

    public Short getId() { return id; }
    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public int getSlotIntervalMin() { return slotIntervalMin; }
    public void setSlotIntervalMin(int v) { this.slotIntervalMin = (short) v; }
    public int getMinPrepMin() { return minPrepMin; }
    public void setMinPrepMin(int v) { this.minPrepMin = (short) v; }
    public int getPickupTimeoutMin() { return pickupTimeoutMin; }
    public void setPickupTimeoutMin(int v) { this.pickupTimeoutMin = (short) v; }
    public boolean isOnlineOrderingOpen() { return onlineOrderingOpen; }
    public void setOnlineOrderingOpen(boolean v) { this.onlineOrderingOpen = v; }
    public int getAsapPrepMin() { return asapPrepMin; }
    public void setAsapPrepMin(int v) { this.asapPrepMin = (short) v; }
}
