package com.minidoodle.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "time_slots")
public class TimeSlot {

    @Id
    private UUID id;

    @Column(name = "calendar_id", nullable = false)
    private UUID calendarId;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SlotStatus status;

    @Version
    private int version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TimeSlot() {
    }

    public TimeSlot(UUID calendarId, Instant startAt, Instant endAt, SlotStatus status) {
        this.id = UUID.randomUUID();
        this.calendarId = calendarId;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = status;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getCalendarId() {
        return calendarId;
    }

    public Instant getStartAt() {
        return startAt;
    }

    public Instant getEndAt() {
        return endAt;
    }

    public SlotStatus getStatus() {
        return status;
    }

    public int getVersion() {
        return version;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setStartAt(Instant startAt) {
        this.startAt = startAt;
    }

    public void setEndAt(Instant endAt) {
        this.endAt = endAt;
    }

    public void setStatus(SlotStatus status) {
        this.status = status;
    }
}
