export type SlotStatus = 'FREE' | 'BUSY'
export type MeetingStatus = 'SCHEDULED' | 'CANCELLED'

export interface User {
  id: string
  email: string
  displayName: string
}

export interface AuthResponse {
  user: User
}

export interface Slot {
  id: string
  startAt: string
  endAt: string
  durationMinutes: number
  status: SlotStatus
  meetingId: string | null
}

export interface Participant {
  id: string
  userId: string | null
  email: string
  displayName: string | null
}

export interface Meeting {
  id: string
  timeSlotId: string
  organizerId: string
  organizerName: string
  title: string
  description: string | null
  status: MeetingStatus
  startAt: string
  endAt: string
  participants: Participant[]
  role: 'ORGANIZER' | 'PARTICIPANT'
}

export interface BusyInterval {
  startAt: string
  endAt: string
  status: SlotStatus
  meetingId: string | null
  meetingTitle: string | null
}

export interface UserAvailability {
  userId: string
  displayName: string
  email: string
  busyIntervals: BusyInterval[]
}

export interface AvailabilityResponse {
  from: string
  to: string
  users: UserAvailability[]
}

export interface ApiError {
  title?: string
  detail?: string
  status?: number
}
