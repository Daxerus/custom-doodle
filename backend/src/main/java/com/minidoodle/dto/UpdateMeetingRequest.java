package com.minidoodle.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateMeetingRequest(
        @Size(max = 255) String title,
        @Size(max = 2000) String description,
        List<String> participantEmails
) {
}
