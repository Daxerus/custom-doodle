ALTER TABLE meeting_participants
    ADD COLUMN invitation_status VARCHAR(20) NOT NULL DEFAULT 'INVITED'
        CHECK (invitation_status IN ('INVITED', 'INVITED_BUSY'));
