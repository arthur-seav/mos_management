package mos.management.dashboard.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalTime;

/** opening_hours: one row per weekday, 0 = Sunday (FR-37). Store-local times. */
@Entity
@Table(name = "opening_hours")
public class OpeningHours {

    @Id
    @Column(name = "day_of_week")
    private Short dayOfWeek;

    private LocalTime openTime;
    private LocalTime closeTime;

    @Column(name = "is_closed")
    private boolean closed;

    protected OpeningHours() {
    }

    public boolean isOpenDay() {
        return !closed && openTime != null && closeTime != null;
    }

    public void setHours(boolean closed, LocalTime open, LocalTime close) {
        this.closed = closed;
        this.openTime = closed ? null : open;
        this.closeTime = closed ? null : close;
    }

    public int getDayOfWeek() { return dayOfWeek; }
    public LocalTime getOpenTime() { return openTime; }
    public LocalTime getCloseTime() { return closeTime; }
    public boolean isClosed() { return closed; }
}
