package com.minidoodle.repository;

import com.minidoodle.domain.Calendar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CalendarRepository extends JpaRepository<Calendar, UUID> {

    Optional<Calendar> findByUserId(UUID userId);

    List<Calendar> findByUserIdIn(List<UUID> userIds);
}
