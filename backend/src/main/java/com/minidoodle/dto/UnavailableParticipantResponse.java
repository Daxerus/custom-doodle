package com.minidoodle.dto;

import java.util.UUID;

public record UnavailableParticipantResponse(
        UUID userId,
        String email,
        String displayName
) {
}
