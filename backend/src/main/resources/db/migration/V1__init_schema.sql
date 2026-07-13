CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(255) NOT NULL,
    token_version BIGINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE calendars (
    id      UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE time_slots (
    id          UUID PRIMARY KEY,
    calendar_id UUID NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    start_at    TIMESTAMPTZ NOT NULL,
    end_at      TIMESTAMPTZ NOT NULL,
    status      VARCHAR(10) NOT NULL CHECK (status IN ('FREE', 'BUSY')),
    version     INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_time_slot_range CHECK (end_at > start_at)
);

CREATE INDEX idx_time_slots_calendar_range ON time_slots (calendar_id, start_at, end_at);

CREATE TABLE meetings (
    id           UUID PRIMARY KEY,
    time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES users(id),
    title        VARCHAR(255) NOT NULL,
    description  TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CANCELLED')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_organizer ON meetings (organizer_id);

CREATE UNIQUE INDEX idx_meetings_one_scheduled_per_slot
    ON meetings (time_slot_id)
    WHERE status = 'SCHEDULED';

CREATE TABLE meeting_participants (
    id                UUID PRIMARY KEY,
    meeting_id        UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    email             VARCHAR(255) NOT NULL,
    invitation_status VARCHAR(20) NOT NULL DEFAULT 'INVITED'
        CHECK (invitation_status IN ('INVITED', 'INVITED_BUSY'))
);

CREATE INDEX idx_meeting_participants_user ON meeting_participants (user_id);
CREATE INDEX idx_meeting_participants_meeting ON meeting_participants (meeting_id);
