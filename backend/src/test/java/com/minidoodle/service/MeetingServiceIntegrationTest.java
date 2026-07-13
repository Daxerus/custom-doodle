package com.minidoodle.service;

import com.minidoodle.domain.MeetingStatus;
import com.minidoodle.domain.ParticipantInvitationStatus;
import com.minidoodle.domain.SlotStatus;
import com.minidoodle.dto.BookMeetingRequest;
import com.minidoodle.dto.CreateSlotRequest;
import com.minidoodle.dto.RegisterRequest;
import com.minidoodle.dto.UserResponse;
import com.minidoodle.repository.MeetingRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MeetingServiceIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private SlotService slotService;

    @Autowired
    private MeetingService meetingService;

    @Autowired
    private MeetingRepository meetingRepository;

    @Test
    void bookMeeting_afterCancel_allowsRebookOnSameSlot() {
        UserResponse user = authService.register(
                new RegisterRequest("Alice", "rebook-test@example.com", "password123")).user();
        Instant start = Instant.parse("2026-10-01T10:00:00Z");

        var slot = slotService.createSlot(user.id(), new CreateSlotRequest(start, 60, SlotStatus.FREE));

        var firstMeeting = meetingService.bookMeeting(
                user.id(), slot.id(), new BookMeetingRequest("First", "Initial booking", List.of()));
        var cancelled = meetingService.cancelMeeting(user.id(), firstMeeting.id());
        assertThat(cancelled.status()).isEqualTo(MeetingStatus.CANCELLED);
        assertThat(cancelled.id()).isEqualTo(firstMeeting.id());
        assertThat(cancelled.title()).isEqualTo("First");

        var slotAfterCancel = slotService.getSlot(user.id(), slot.id());
        assertThat(slotAfterCancel.status()).isEqualTo(SlotStatus.FREE);
        assertThat(slotAfterCancel.meetingId()).isNull();

        var secondMeeting = meetingService.bookMeeting(
                user.id(), slot.id(), new BookMeetingRequest("Second", "Rebooked", List.of()));

        assertThat(secondMeeting.id()).isNotEqualTo(firstMeeting.id());
        assertThat(secondMeeting.title()).isEqualTo("Second");
        assertThat(secondMeeting.status()).isEqualTo(MeetingStatus.SCHEDULED);

        var slotAfterRebook = slotService.getSlot(user.id(), slot.id());
        assertThat(slotAfterRebook.status()).isEqualTo(SlotStatus.BUSY);
        assertThat(slotAfterRebook.meetingId()).isEqualTo(secondMeeting.id());

        var meetingsOnSlot = meetingRepository.findAll().stream()
                .filter(m -> m.getTimeSlotId().equals(slot.id()))
                .toList();
        assertThat(meetingsOnSlot).hasSize(2);
        assertThat(meetingsOnSlot)
                .extracting(m -> m.getStatus())
                .containsExactlyInAnyOrder(MeetingStatus.CANCELLED, MeetingStatus.SCHEDULED);
    }

    @Test
    void bookMeeting_reportsUnavailableRegisteredParticipantsWithoutBlocking() {
        UserResponse alice = authService.register(
                new RegisterRequest("Alice", "alice-unavail@example.com", "password123")).user();
        UserResponse bob = authService.register(
                new RegisterRequest("Bob", "bob-unavail@example.com", "password123")).user();
        Instant start = Instant.parse("2026-11-01T10:00:00Z");

        var aliceSlot = slotService.createSlot(alice.id(), new CreateSlotRequest(start, 60, SlotStatus.FREE));
        slotService.createSlot(bob.id(), new CreateSlotRequest(start, 60, SlotStatus.BUSY));

        var meeting = meetingService.bookMeeting(
                alice.id(),
                aliceSlot.id(),
                new BookMeetingRequest("Sync", "Weekly", List.of("bob-unavail@example.com")));

        assertThat(meeting.status()).isEqualTo(MeetingStatus.SCHEDULED);
        assertThat(meeting.unavailableParticipants()).hasSize(1);
        assertThat(meeting.unavailableParticipants().getFirst().email()).isEqualTo("bob-unavail@example.com");
        assertThat(meeting.unavailableParticipants().getFirst().userId()).isEqualTo(bob.id());
        assertThat(meeting.participants().getFirst().invitationStatus()).isEqualTo(ParticipantInvitationStatus.INVITED_BUSY);
        assertThat(meetingService.listMeetings(bob.id(), 0, 50).content()).hasSize(1);
    }

    @Test
    void bookMeeting_noUnavailableWhenParticipantHasFreeSlot() {
        UserResponse alice = authService.register(
                new RegisterRequest("Alice", "alice-avail@example.com", "password123")).user();
        UserResponse bob = authService.register(
                new RegisterRequest("Bob", "bob-avail@example.com", "password123")).user();
        Instant start = Instant.parse("2026-11-02T10:00:00Z");

        var aliceSlot = slotService.createSlot(alice.id(), new CreateSlotRequest(start, 60, SlotStatus.FREE));
        slotService.createSlot(bob.id(), new CreateSlotRequest(start, 60, SlotStatus.FREE));

        var meeting = meetingService.bookMeeting(
                alice.id(),
                aliceSlot.id(),
                new BookMeetingRequest("Sync", "Weekly", List.of("bob-avail@example.com")));

        assertThat(meeting.unavailableParticipants()).isEmpty();
        assertThat(meeting.participants().getFirst().invitationStatus()).isEqualTo(ParticipantInvitationStatus.INVITED);
        assertThat(meetingService.listMeetings(bob.id(), 0, 50).content()).hasSize(1);
    }
}
