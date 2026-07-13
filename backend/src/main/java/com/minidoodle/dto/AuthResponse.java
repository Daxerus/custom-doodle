package com.minidoodle.dto;

public record AuthResponse(
        String accessToken,
        UserResponse user
) {
}
