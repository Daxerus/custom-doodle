-- Allow multiple meeting rows per slot over time, but only one SCHEDULED at a time.
ALTER TABLE meetings DROP CONSTRAINT meetings_time_slot_id_key;

CREATE UNIQUE INDEX idx_meetings_one_scheduled_per_slot
    ON meetings (time_slot_id)
    WHERE status = 'SCHEDULED';
