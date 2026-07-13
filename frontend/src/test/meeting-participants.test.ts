import { describe, expect, it } from 'vitest'
import { normalizeMeeting, partitionParticipants } from '@/lib/meeting-participants'
import type { Meeting } from '@/types'

const baseMeeting: Meeting = {
  id: 'm1',
  timeSlotId: 's1',
  organizerId: 'o1',
  organizerName: 'Alice',
  title: 'Sync',
  description: null,
  status: 'SCHEDULED',
  startAt: '2026-07-15T10:00:00Z',
  endAt: '2026-07-15T11:00:00Z',
  role: 'ORGANIZER',
  unavailableParticipants: [],
  participants: [
    {
      id: 'p1',
      userId: 'u1',
      email: 'bob@example.com',
      displayName: 'Bob',
      invitationStatus: 'INVITED',
    },
    {
      id: 'p2',
      userId: 'u2',
      email: 'carol@example.com',
      displayName: 'Carol',
      invitationStatus: 'INVITED_BUSY',
    },
  ],
}

describe('meeting-participants', () => {
  it('partitions invited and busy participants', () => {
    const { invitedParticipants, busyInvites } = partitionParticipants(baseMeeting)
    expect(invitedParticipants).toHaveLength(1)
    expect(busyInvites).toHaveLength(1)
    expect(invitedParticipants[0]?.email).toBe('bob@example.com')
    expect(busyInvites[0]?.email).toBe('carol@example.com')
  })

  it('normalizes invitation status from unavailable list', () => {
    const meeting: Meeting = {
      ...baseMeeting,
      participants: [
        {
          id: 'p1',
          userId: 'u1',
          email: 'bob@example.com',
          displayName: 'Bob',
          invitationStatus: 'INVITED_BUSY',
        },
      ],
      unavailableParticipants: [
        { userId: 'u1', email: 'bob@example.com', displayName: 'Bob' },
      ],
    }

    const normalized = normalizeMeeting(meeting)
    expect(normalized.participants[0]?.invitationStatus).toBe('INVITED_BUSY')
  })
})
