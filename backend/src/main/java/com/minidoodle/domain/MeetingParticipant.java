package com.minidoodle.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "meeting_participants")
public class MeetingParticipant {

    @Id
    private UUID id;

    @Column(name = "meeting_id", nullable = false)
    private UUID meetingId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(nullable = false)
    private String email;

    protected MeetingParticipant() {
    }

    public MeetingParticipant(UUID meetingId, UUID userId, String email) {
        this.id = UUID.randomUUID();
        this.meetingId = meetingId;
        this.userId = userId;
        this.email = email;
    }

    public UUID getId() {
        return id;
    }

    public UUID getMeetingId() {
        return meetingId;
    }

    public UUID getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }
}
