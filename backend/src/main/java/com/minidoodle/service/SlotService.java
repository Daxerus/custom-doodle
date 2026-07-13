package com.minidoodle.service;

import com.minidoodle.domain.Meeting;
import com.minidoodle.domain.MeetingStatus;
import com.minidoodle.domain.SlotStatus;
import com.minidoodle.domain.TimeSlot;
import com.minidoodle.dto.CreateSlotRequest;
import com.minidoodle.dto.PageResponse;
import com.minidoodle.dto.SlotResponse;
import com.minidoodle.dto.UpdateSlotRequest;
import com.minidoodle.exception.ApiException;
import com.minidoodle.repository.MeetingRepository;
import com.minidoodle.repository.TimeSlotRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SlotService {

    private static final int MAX_PAGE_SIZE = 100;

    private final TimeSlotRepository timeSlotRepository;
    private final MeetingRepository meetingRepository;
    private final CalendarService calendarService;

    public SlotService(
            TimeSlotRepository timeSlotRepository,
            MeetingRepository meetingRepository,
            CalendarService calendarService) {
        this.timeSlotRepository = timeSlotRepository;
        this.meetingRepository = meetingRepository;
        this.calendarService = calendarService;
    }

    public PageResponse<SlotResponse> listSlots(UUID userId, Instant from, Instant to, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        UUID calendarId = calendarService.getCalendarIdForUser(userId);
        Page<TimeSlot> slotPage = timeSlotRepository
                .findByCalendarIdAndStartAtLessThanAndEndAtGreaterThanOrderByStartAt(
                        calendarId, to, from, PageRequest.of(Math.max(page, 0), safeSize));

        List<UUID> slotIds = slotPage.getContent().stream().map(TimeSlot::getId).toList();
        Map<UUID, UUID> meetingIdsBySlot = slotIds.isEmpty()
                ? Map.of()
                : meetingRepository.findScheduledByTimeSlotIds(slotIds).stream()
                        .collect(Collectors.toMap(Meeting::getTimeSlotId, Meeting::getId, (a, b) -> a));

        List<SlotResponse> content = slotPage.getContent().stream()
                .map(slot -> SlotResponse.from(slot, meetingIdsBySlot.get(slot.getId())))
                .toList();

        return PageResponse.from(slotPage, content);
    }

    public SlotResponse getSlot(UUID userId, UUID slotId) {
        TimeSlot slot = getOwnedSlot(userId, slotId);
        return SlotResponse.from(slot, getMeetingId(slot.getId()));
    }

    @Transactional
    public SlotResponse createSlot(UUID userId, CreateSlotRequest request) {
        UUID calendarId = calendarService.getCalendarIdForUser(userId);
        Instant endAt = request.startAt().plusSeconds(request.durationMinutes() * 60L);

        if (timeSlotRepository.existsOverlapping(calendarId, request.startAt(), endAt)) {
            throw new ApiException("slot-overlap", "The requested time range overlaps with an existing slot", HttpStatus.CONFLICT);
        }

        TimeSlot slot = new TimeSlot(calendarId, request.startAt(), endAt, request.status());
        return SlotResponse.from(timeSlotRepository.save(slot), null);
    }

    @Transactional
    public SlotResponse updateSlot(UUID userId, UUID slotId, UpdateSlotRequest request) {
        TimeSlot slot = getOwnedSlot(userId, slotId);

        if (meetingRepository.existsByTimeSlotIdAndStatus(slotId, MeetingStatus.SCHEDULED)) {
            if (request.startAt() != null || request.durationMinutes() != null) {
                throw new ApiException("slot-has-meeting", "Cannot change time of a slot with an active meeting", HttpStatus.CONFLICT);
            }
        }

        Instant startAt = request.startAt() != null ? request.startAt() : slot.getStartAt();
        Instant endAt = request.durationMinutes() != null
                ? startAt.plusSeconds(request.durationMinutes() * 60L)
                : slot.getEndAt();

        if (request.startAt() != null || request.durationMinutes() != null) {
            if (timeSlotRepository.existsOverlapping(slot.getCalendarId(), startAt, endAt, slot.getId())) {
                throw new ApiException("slot-overlap", "The requested time range overlaps with an existing slot", HttpStatus.CONFLICT);
            }
            slot.setStartAt(startAt);
            slot.setEndAt(endAt);
        }

        if (request.status() != null) {
            if (request.status() == SlotStatus.FREE && getMeetingId(slotId) != null) {
                throw new ApiException("slot-has-meeting", "Cannot set slot to FREE while a meeting is scheduled", HttpStatus.CONFLICT);
            }
            slot.setStatus(request.status());
        }

        return SlotResponse.from(timeSlotRepository.save(slot), getMeetingId(slot.getId()));
    }

    @Transactional
    public SlotResponse updateStatus(UUID userId, UUID slotId, SlotStatus status) {
        TimeSlot slot = getOwnedSlot(userId, slotId);

        if (status == SlotStatus.FREE && getMeetingId(slotId) != null) {
            throw new ApiException("slot-has-meeting", "Cannot set slot to FREE while a meeting is scheduled", HttpStatus.CONFLICT);
        }

        slot.setStatus(status);
        return SlotResponse.from(timeSlotRepository.save(slot), getMeetingId(slot.getId()));
    }

    @Transactional
    public void deleteSlot(UUID userId, UUID slotId) {
        TimeSlot slot = getOwnedSlot(userId, slotId);
        if (getMeetingId(slotId) != null) {
            throw new ApiException("slot-has-meeting", "Cannot delete a slot with an active meeting", HttpStatus.CONFLICT);
        }
        timeSlotRepository.delete(slot);
    }

    public TimeSlot getOwnedSlotEntity(UUID userId, UUID slotId) {
        return getOwnedSlot(userId, slotId);
    }

    private TimeSlot getOwnedSlot(UUID userId, UUID slotId) {
        UUID calendarId = calendarService.getCalendarIdForUser(userId);
        return timeSlotRepository.findByIdAndCalendarId(slotId, calendarId)
                .orElseThrow(() -> new ApiException("slot-not-found", "Time slot not found", HttpStatus.NOT_FOUND));
    }

    private UUID getMeetingId(UUID slotId) {
        return meetingRepository.findByTimeSlotIdAndStatus(slotId, MeetingStatus.SCHEDULED)
                .map(Meeting::getId)
                .orElse(null);
    }
}
