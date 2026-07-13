import type { Meeting, Participant, ParticipantInvitationStatus, UnavailableParticipant } from '@/types'

export function isInvitedBusyStatus(status: string | undefined | null): boolean {
  return status?.toUpperCase() === 'INVITED_BUSY'
}

export function resolveParticipantInvitationStatus(
  participant: Pick<Participant, 'userId' | 'email' | 'invitationStatus'>,
  unavailableParticipants: UnavailableParticipant[] = [],
): ParticipantInvitationStatus {
  if (isInvitedBusyStatus(participant.invitationStatus)) {
    return 'INVITED_BUSY'
  }
  if (participant.invitationStatus?.toUpperCase() === 'INVITED') {
    return 'INVITED'
  }

  const email = participant.email.toLowerCase()
  const isUnavailable = unavailableParticipants.some(
    (u) => u.userId === participant.userId || u.email.toLowerCase() === email,
  )

  return isUnavailable ? 'INVITED_BUSY' : 'INVITED'
}

export function normalizeMeeting(meeting: Meeting): Meeting {
  const unavailableParticipants = meeting.unavailableParticipants ?? []

  return {
    ...meeting,
    unavailableParticipants,
    participants: meeting.participants.map((participant) => ({
      ...participant,
      invitationStatus: resolveParticipantInvitationStatus(participant, unavailableParticipants),
    })),
  }
}

export function partitionParticipants(meeting: Meeting) {
  const normalized = normalizeMeeting(meeting)

  const invitedParticipants = normalized.participants.filter((p) => p.invitationStatus === 'INVITED')
  const busyInvites = normalized.participants.filter((p) => p.invitationStatus === 'INVITED_BUSY')

  return { invitedParticipants, busyInvites, normalized }
}
