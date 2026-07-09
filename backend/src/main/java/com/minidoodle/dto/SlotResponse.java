package com.minidoodle.dto;

import com.minidoodle.domain.SlotStatus;
import com.minidoodle.domain.TimeSlot;

import java.time.Instant;
import java.util.UUID;

public record SlotResponse(
        UUID id,
        Instant startAt,
        Instant endAt,
        int durationMinutes,
        SlotStatus status,
        UUID meetingId
) {
    public static SlotResponse from(TimeSlot slot, UUID meetingId) {
        long minutes = (slot.getEndAt().getEpochSecond() - slot.getStartAt().getEpochSecond()) / 60;
        return new SlotResponse(
                slot.getId(),
                slot.getStartAt(),
                slot.getEndAt(),
                (int) minutes,
                slot.getStatus(),
                meetingId);
    }
}
