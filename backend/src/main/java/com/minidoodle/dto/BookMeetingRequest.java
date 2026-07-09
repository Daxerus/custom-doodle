package com.minidoodle.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BookMeetingRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String description,
        List<String> participantEmails
) {
}
