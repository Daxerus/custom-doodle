package com.minidoodle.repository;

import com.minidoodle.domain.TimeSlot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TimeSlotRepository extends JpaRepository<TimeSlot, UUID> {

    List<TimeSlot> findByCalendarIdAndStartAtLessThanAndEndAtGreaterThanOrderByStartAt(
            UUID calendarId, Instant rangeEnd, Instant rangeStart);

    Page<TimeSlot> findByCalendarIdAndStartAtLessThanAndEndAtGreaterThanOrderByStartAt(
            UUID calendarId, Instant rangeEnd, Instant rangeStart, Pageable pageable);

    @Query("""
            SELECT COUNT(ts) > 0 FROM TimeSlot ts
            WHERE ts.calendarId = :calendarId
              AND ts.id <> :excludeId
              AND ts.startAt < :endAt
              AND ts.endAt > :startAt
            """)
    boolean existsOverlapping(
            @Param("calendarId") UUID calendarId,
            @Param("startAt") Instant startAt,
            @Param("endAt") Instant endAt,
            @Param("excludeId") UUID excludeId);

    default boolean existsOverlapping(UUID calendarId, Instant startAt, Instant endAt) {
        return existsOverlapping(calendarId, startAt, endAt, UUID.fromString("00000000-0000-0000-0000-000000000000"));
    }

    List<TimeSlot> findByCalendarIdInAndStartAtLessThanAndEndAtGreaterThanOrderByStartAt(
            List<UUID> calendarIds, Instant rangeEnd, Instant rangeStart);

    Optional<TimeSlot> findByIdAndCalendarId(UUID id, UUID calendarId);
}
