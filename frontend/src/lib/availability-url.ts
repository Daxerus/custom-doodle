import { endOfDay, startOfDay } from 'date-fns'
import type { UnavailableParticipant } from '@/types'

export function buildAvailabilityUrl(
  unavailable: UnavailableParticipant[],
  meetingStartAt: string,
  meetingEndAt: string,
): string {
  const from = startOfDay(new Date(meetingStartAt)).toISOString()
  const to = endOfDay(new Date(meetingEndAt)).toISOString()
  const params = new URLSearchParams({
    userIds: unavailable.map((u) => u.userId).join(','),
    from,
    to,
    focusStart: meetingStartAt,
    focusEnd: meetingEndAt,
    auto: '1',
  })
  return `/availability?${params.toString()}`
}
