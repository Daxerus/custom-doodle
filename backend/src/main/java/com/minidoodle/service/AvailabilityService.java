package com.minidoodle.service;

import com.minidoodle.domain.Calendar;
import com.minidoodle.domain.Meeting;
import com.minidoodle.domain.TimeSlot;
import com.minidoodle.domain.User;
import com.minidoodle.dto.AvailabilityResponse;
import com.minidoodle.dto.AvailabilityResponse.BusyInterval;
import com.minidoodle.dto.AvailabilityResponse.UserAvailability;
import com.minidoodle.exception.ApiException;
import com.minidoodle.repository.CalendarRepository;
import com.minidoodle.repository.MeetingRepository;
import com.minidoodle.repository.TimeSlotRepository;
import com.minidoodle.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AvailabilityService {

    private static final long MAX_RANGE_DAYS = 90;

    private final UserRepository userRepository;
    private final CalendarRepository calendarRepository;
    private final TimeSlotRepository timeSlotRepository;
    private final MeetingRepository meetingRepository;
    private final ParticipantAvailabilityService participantAvailabilityService;

    public AvailabilityService(
            UserRepository userRepository,
            CalendarRepository calendarRepository,
            TimeSlotRepository timeSlotRepository,
            MeetingRepository meetingRepository,
            ParticipantAvailabilityService participantAvailabilityService) {
        this.userRepository = userRepository;
        this.calendarRepository = calendarRepository;
        this.timeSlotRepository = timeSlotRepository;
        this.meetingRepository = meetingRepository;
        this.participantAvailabilityService = participantAvailabilityService;
    }

    public AvailabilityResponse getAvailability(List<UUID> userIds, Instant from, Instant to) {
        if (userIds == null || userIds.isEmpty()) {
            throw new ApiException("invalid-request", "At least one userId is required", HttpStatus.BAD_REQUEST);
        }
        if (!from.isBefore(to)) {
            throw new ApiException("invalid-request", "from must be before to", HttpStatus.BAD_REQUEST);
        }
        if (Duration.between(from, to).toDays() > MAX_RANGE_DAYS) {
            throw new ApiException("invalid-request", "Date range cannot exceed 90 days", HttpStatus.BAD_REQUEST);
        }

        List<User> users = userRepository.findAllById(userIds);
        Map<UUID, User> userMap = users.stream().collect(Collectors.toMap(User::getId, Function.identity()));

        List<Calendar> calendars = calendarRepository.findByUserIdIn(userIds);

        Map<UUID, UUID> calendarToUser = calendars.stream()
                .collect(Collectors.toMap(Calendar::getId, Calendar::getUserId));

        List<UUID> calendarIds = calendars.stream().map(Calendar::getId).toList();

        List<TimeSlot> slots = calendarIds.isEmpty()
                ? List.of()
                : timeSlotRepository.findByCalendarIdInAndStartAtLessThanAndEndAtGreaterThanOrderByStartAt(
                        calendarIds, to, from);

        List<UUID> slotIds = slots.stream().map(TimeSlot::getId).toList();
        Map<UUID, Meeting> meetingsBySlot = slotIds.isEmpty()
                ? Map.of()
                : meetingRepository.findScheduledByTimeSlotIds(slotIds).stream()
                        .collect(Collectors.toMap(Meeting::getTimeSlotId, Function.identity(), (a, b) -> a));

        List<UserAvailability> userAvailabilities = new ArrayList<>();
        for (UUID userId : userIds) {
            User user = userMap.get(userId);
            if (user == null) {
                continue;
            }

            UUID calendarId = calendars.stream()
                    .filter(c -> c.getUserId().equals(userId))
                    .map(Calendar::getId)
                    .findFirst()
                    .orElse(null);

            List<BusyInterval> busyIntervals = slots.stream()
                    .filter(s -> calendarId != null && s.getCalendarId().equals(calendarId))
                    .map(s -> {
                        Meeting meeting = meetingsBySlot.get(s.getId());
                        return new BusyInterval(
                                s.getStartAt(),
                                s.getEndAt(),
                                s.getStatus(),
                                meeting != null ? meeting.getId() : null,
                                meeting != null ? meeting.getTitle() : null);
                    })
                    .toList();

            userAvailabilities.add(new UserAvailability(
                    user.getId(),
                    user.getDisplayName(),
                    user.getEmail(),
                    busyIntervals,
                    participantAvailabilityService.hasFreeSlotInRange(userId, from, to)));
        }

        return new AvailabilityResponse(from, to, userAvailabilities);
    }
}
