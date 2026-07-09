package com.minidoodle.dto;

import com.minidoodle.domain.SlotStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.time.Instant;

public record UpdateSlotRequest(
        Instant startAt,
        @Min(15) @Max(480) Integer durationMinutes,
        SlotStatus status
) {
}
