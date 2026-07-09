package com.minidoodle.dto;

import com.minidoodle.domain.SlotStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AvailabilityResponse(
        Instant from,
        Instant to,
        List<UserAvailability> users
) {
    public record UserAvailability(
            UUID userId,
            String displayName,
            String email,
            List<BusyInterval> busyIntervals
    ) {
    }

    public record BusyInterval(
            Instant startAt,
            Instant endAt,
            SlotStatus status,
            UUID meetingId,
            String meetingTitle
    ) {
    }
}
