package com.minidoodle.dto;

import com.minidoodle.domain.SlotStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateSlotStatusRequest(
        @NotNull SlotStatus status
) {
}
