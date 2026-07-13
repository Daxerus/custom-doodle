package com.minidoodle.service;

import com.minidoodle.domain.MeetingStatus;
import com.minidoodle.domain.SlotStatus;
import com.minidoodle.domain.TimeSlot;
import com.minidoodle.repository.MeetingRepository;
import com.minidoodle.repository.TimeSlotRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ParticipantAvailabilityService {

    private final TimeSlotRepository timeSlotRepository;
    private final MeetingRepository meetingRepository;
    private final CalendarService calendarService;

    public ParticipantAvailabilityService(
            TimeSlotRepository timeSlotRepository,
            MeetingRepository meetingRepository,
            CalendarService calendarService) {
        this.timeSlotRepository = timeSlotRepository;
        this.meetingRepository = meetingRepository;
        this.calendarService = calendarService;
    }

    /**
     * A user is available at a specific time when they have at least one FREE slot
     * overlapping the window that is not already booked with a meeting.
     * Having no slots, only BUSY slots, or only booked slots counts as unavailable.
     */
    public boolean isAvailableAt(UUID userId, Instant startAt, Instant endAt) {
        UUID calendarId = calendarService.getCalendarIdForUser(userId);
        List<TimeSlot> overlapping = timeSlotRepository
                .findByCalendarIdAndStartAtLessThanAndEndAtGreaterThanOrderByStartAt(
                        calendarId, endAt, startAt);

        return overlapping.stream().anyMatch(this::isBookableFreeSlot);
    }

    public boolean hasFreeSlotInRange(UUID userId, Instant from, Instant to) {
        UUID calendarId = calendarService.getCalendarIdForUser(userId);
        List<TimeSlot> slots = timeSlotRepository
                .findByCalendarIdAndStartAtLessThanAndEndAtGreaterThanOrderByStartAt(
                        calendarId, to, from);

        return slots.stream().anyMatch(this::isBookableFreeSlot);
    }

    private boolean isBookableFreeSlot(TimeSlot slot) {
        return slot.getStatus() == SlotStatus.FREE
                && !meetingRepository.existsByTimeSlotIdAndStatus(slot.getId(), MeetingStatus.SCHEDULED);
    }
}
