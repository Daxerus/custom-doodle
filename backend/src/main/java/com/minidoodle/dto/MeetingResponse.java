package com.minidoodle.dto;

import com.minidoodle.domain.Meeting;
import com.minidoodle.domain.MeetingStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MeetingResponse(
        UUID id,
        UUID timeSlotId,
        UUID organizerId,
        String organizerName,
        String title,
        String description,
        MeetingStatus status,
        Instant startAt,
        Instant endAt,
        List<ParticipantResponse> participants,
        String role
) {
    public static MeetingResponse from(
            Meeting meeting,
            String organizerName,
            Instant startAt,
            Instant endAt,
            List<ParticipantResponse> participants,
            String role) {
        return new MeetingResponse(
                meeting.getId(),
                meeting.getTimeSlotId(),
                meeting.getOrganizerId(),
                organizerName,
                meeting.getTitle(),
                meeting.getDescription(),
                meeting.getStatus(),
                startAt,
                endAt,
                participants,
                role);
    }
}
