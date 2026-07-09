package com.minidoodle.dto;

import com.minidoodle.domain.SlotStatus;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record CreateSlotRequest(
        @NotNull Instant startAt,
        @Min(15) @Max(480) int durationMinutes,
        @NotNull SlotStatus status
) {
}
