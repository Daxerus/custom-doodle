import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format, isPast } from 'date-fns'
import { meetingsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { EmptyState, PageHeader, StatusBadge } from '@/components/shared'

type Filter = 'UPCOMING' | 'PAST' | 'ALL'

export function MeetingsPage() {
  const [filter, setFilter] = useState<Filter>('UPCOMING')

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings'],
    queryFn: meetingsApi.list,
  })

  const filtered = meetings.filter((m) => {
    if (m.status === 'CANCELLED') return filter === 'ALL'
    const past = isPast(new Date(m.endAt))
    if (filter === 'UPCOMING') return !past && m.status === 'SCHEDULED'
    if (filter === 'PAST') return past
    return true
  })

  return (
    <div>
      <PageHeader title="Meetings" description="Meetings you organize or participate in" />

      <div className="mb-4 flex gap-2">
        {(['UPCOMING', 'PAST', 'ALL'] as Filter[]).map((f) => (
          <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-lg bg-[var(--color-muted)]" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No meetings scheduled"
          description="Book a meeting from a free time slot on your schedule."
          action={<Link to="/schedule"><Button>Go to Schedule</Button></Link>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((meeting) => {
            const invitedCount = meeting.participants.filter((p) => (p.invitationStatus ?? 'INVITED') === 'INVITED').length
            const busyCount = meeting.participants.filter((p) => p.invitationStatus === 'INVITED_BUSY').length
            return (
            <Link
              key={meeting.id}
              to={`/meetings/${meeting.id}`}
              className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-4 hover:bg-[var(--color-accent)]"
            >
              <div>
                <div className="font-medium">{meeting.title}</div>
                <div className="text-sm text-[var(--color-muted-foreground)]">
                  {format(new Date(meeting.startAt), 'EEE, MMM d · HH:mm')} – {format(new Date(meeting.endAt), 'HH:mm')}
                </div>
                <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {invitedCount} participant{invitedCount !== 1 ? 's' : ''}
                  {busyCount > 0 && ` · ${busyCount} invited but busy`}
                  {' · '}{meeting.role}
                </div>
              </div>
              <StatusBadge status={meeting.status === 'SCHEDULED' ? 'BUSY' : 'FREE'} meetingId={meeting.status === 'SCHEDULED' ? meeting.id : null} />
            </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
