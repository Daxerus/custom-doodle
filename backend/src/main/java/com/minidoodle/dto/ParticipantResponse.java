package com.minidoodle.dto;

import com.minidoodle.domain.MeetingParticipant;

import java.util.UUID;

public record ParticipantResponse(
        UUID id,
        UUID userId,
        String email,
        String displayName
) {
    public static ParticipantResponse from(MeetingParticipant participant, String displayName) {
        return new ParticipantResponse(
                participant.getId(),
                participant.getUserId(),
                participant.getEmail(),
                displayName);
    }
}
