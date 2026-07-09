package com.minidoodle.service;

import com.minidoodle.domain.Calendar;
import com.minidoodle.exception.ApiException;
import com.minidoodle.repository.CalendarRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class CalendarService {

    private final CalendarRepository calendarRepository;

    public CalendarService(CalendarRepository calendarRepository) {
        this.calendarRepository = calendarRepository;
    }

    public Calendar getCalendarForUser(UUID userId) {
        return calendarRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException("calendar-not-found", "Calendar not found", HttpStatus.NOT_FOUND));
    }

    public UUID getCalendarIdForUser(UUID userId) {
        return getCalendarForUser(userId).getId();
    }
}
