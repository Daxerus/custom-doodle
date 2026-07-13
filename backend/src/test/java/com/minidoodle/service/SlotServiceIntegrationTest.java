package com.minidoodle.service;

import com.minidoodle.domain.SlotStatus;
import com.minidoodle.dto.CreateSlotRequest;
import com.minidoodle.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SlotServiceIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private SlotService slotService;

    @Test
    void createSlot_rejectsOverlap() {
        var register = new com.minidoodle.dto.RegisterRequest("Test User", "slot-test@example.com", "password123");
        var user = authService.register(register).user();
        Instant start = Instant.parse("2026-08-01T10:00:00Z");

        slotService.createSlot(user.id(), new CreateSlotRequest(start, 60, SlotStatus.FREE));

        assertThatThrownBy(() ->
                slotService.createSlot(user.id(), new CreateSlotRequest(start.plusSeconds(1800), 60, SlotStatus.FREE)))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void createSlot_success() {
        var register = new com.minidoodle.dto.RegisterRequest("Test User 2", "slot-test2@example.com", "password123");
        var user = authService.register(register).user();
        Instant start = Instant.parse("2026-09-01T10:00:00Z");

        var slot = slotService.createSlot(user.id(), new CreateSlotRequest(start, 30, SlotStatus.FREE));

        assertThat(slot.status()).isEqualTo(SlotStatus.FREE);
        assertThat(slot.durationMinutes()).isEqualTo(30);
        assertThat(slot.id()).isNotNull();
    }
}
