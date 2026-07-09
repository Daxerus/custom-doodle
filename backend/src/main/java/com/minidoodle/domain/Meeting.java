package com.minidoodle.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "meetings")
public class Meeting {

    @Id
    private UUID id;

    @Column(name = "time_slot_id", nullable = false, unique = true)
    private UUID timeSlotId;

    @Column(name = "organizer_id", nullable = false)
    private UUID organizerId;

    @Column(nullable = false)
    private String title;

    @Column
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MeetingStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Meeting() {
    }

    public Meeting(UUID timeSlotId, UUID organizerId, String title, String description) {
        this.id = UUID.randomUUID();
        this.timeSlotId = timeSlotId;
        this.organizerId = organizerId;
        this.title = title;
        this.description = description;
        this.status = MeetingStatus.SCHEDULED;
        this.createdAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getTimeSlotId() {
        return timeSlotId;
    }

    public UUID getOrganizerId() {
        return organizerId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public MeetingStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setStatus(MeetingStatus status) {
        this.status = status;
    }
}
