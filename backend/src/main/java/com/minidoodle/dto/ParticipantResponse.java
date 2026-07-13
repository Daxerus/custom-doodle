package com.minidoodle.dto;

import com.minidoodle.domain.MeetingParticipant;
import com.minidoodle.domain.ParticipantInvitationStatus;

import java.util.UUID;

public record ParticipantResponse(
        UUID id,
        UUID userId,
        String email,
        String displayName,
        ParticipantInvitationStatus invitationStatus
) {
    public static ParticipantResponse from(MeetingParticipant participant, String displayName) {
        return new ParticipantResponse(
                participant.getId(),
                participant.getUserId(),
                participant.getEmail(),
                displayName,
                participant.getInvitationStatus());
    }
}
