package com.minidoodle.service;

import com.minidoodle.domain.SlotStatus;
import com.minidoodle.dto.CreateSlotRequest;
import com.minidoodle.dto.RegisterRequest;
import com.minidoodle.dto.UserResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AvailabilityServiceIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private SlotService slotService;

    @Autowired
    private AvailabilityService availabilityService;

    @Test
    void getAvailability_returnsBusyIntervalsAndFreeSlotFlag() {
        UserResponse alice = authService.register(
                new RegisterRequest("Alice", "avail-alice@example.com", "password123")).user();
        UserResponse bob = authService.register(
                new RegisterRequest("Bob", "avail-bob@example.com", "password123")).user();

        Instant from = Instant.parse("2026-12-01T08:00:00Z");
        Instant to = Instant.parse("2026-12-01T18:00:00Z");

        slotService.createSlot(alice.id(), new CreateSlotRequest(
                Instant.parse("2026-12-01T10:00:00Z"), 60, SlotStatus.FREE));
        slotService.createSlot(bob.id(), new CreateSlotRequest(
                Instant.parse("2026-12-01T10:00:00Z"), 60, SlotStatus.BUSY));

        var response = availabilityService.getAvailability(List.of(alice.id(), bob.id()), from, to);

        assertThat(response.users()).hasSize(2);
        var aliceAvailability = response.users().stream()
                .filter(u -> u.userId().equals(alice.id()))
                .findFirst()
                .orElseThrow();
        var bobAvailability = response.users().stream()
                .filter(u -> u.userId().equals(bob.id()))
                .findFirst()
                .orElseThrow();

        assertThat(aliceAvailability.hasFreeSlotInRange()).isTrue();
        assertThat(bobAvailability.hasFreeSlotInRange()).isFalse();
        assertThat(aliceAvailability.busyIntervals()).hasSize(1);
    }

    @Test
    void getAvailability_rejectsRangeOver90Days() {
        UserResponse alice = authService.register(
                new RegisterRequest("Alice", "avail-range@example.com", "password123")).user();

        Instant from = Instant.parse("2026-01-01T00:00:00Z");
        Instant to = Instant.parse("2026-05-01T00:00:00Z");

        assertThatThrownBy(() -> availabilityService.getAvailability(List.of(alice.id()), from, to))
                .hasMessageContaining("90 days");
    }

    @Test
    void getAvailability_ignoresUnknownUserIds() {
        UserResponse alice = authService.register(
                new RegisterRequest("Alice", "avail-unknown@example.com", "password123")).user();

        var response = availabilityService.getAvailability(
                List.of(alice.id(), UUID.randomUUID()),
                Instant.parse("2026-12-01T08:00:00Z"),
                Instant.parse("2026-12-01T18:00:00Z"));

        assertThat(response.users()).hasSize(1);
        assertThat(response.users().getFirst().userId()).isEqualTo(alice.id());
    }
}
