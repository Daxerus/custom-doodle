import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import { availabilityApi, getErrorMessage, usersApi } from '@/lib/api'
import type { BusyInterval, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiErrorAlert, EmptyState, PageHeader } from '@/components/shared'
import { cn } from '@/lib/utils'

export function AvailabilityPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [from, setFrom] = useState(format(new Date(), "yyyy-MM-dd'T'00:00"))
  const [to, setTo] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd'T'23:59"))
  const [error, setError] = useState('')
  const [queryParams, setQueryParams] = useState<{ userIds: string[]; from: string; to: string } | null>(null)
  const [focusWindow, setFocusWindow] = useState<{ start: string; end: string } | null>(null)

  useEffect(() => {
    const userIdsParam = searchParams.get('userIds')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const auto = searchParams.get('auto')
    const focusStart = searchParams.get('focusStart')
    const focusEnd = searchParams.get('focusEnd')

    if (focusStart && focusEnd) {
      setFocusWindow({ start: focusStart, end: focusEnd })
    }

    if (!userIdsParam || !fromParam || !toParam) {
      return
    }

    const userIds = userIdsParam.split(',').filter(Boolean)
    if (userIds.length === 0) {
      return
    }

    setFrom(format(new Date(fromParam), "yyyy-MM-dd'T'HH:mm"))
    setTo(format(new Date(toParam), "yyyy-MM-dd'T'HH:mm"))
    setSelectedUsers(userIds.map((id) => ({ id, email: '', displayName: 'Loading…' })))

    if (auto === '1' || auto === 'true') {
      setQueryParams({ userIds, from: fromParam, to: toParam })
    }
  }, [searchParams])

  const { data: searchResults = [] } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.search(search),
    enabled: search.length >= 2,
  })

  const { data: availability, isLoading, isFetching, isError, error: queryError } = useQuery({
    queryKey: ['availability', queryParams],
    queryFn: () => availabilityApi.query(queryParams!.userIds, queryParams!.from, queryParams!.to),
    enabled: !!queryParams,
  })

  useEffect(() => {
    if (!availability?.users.length) {
      return
    }
    setSelectedUsers(availability.users.map((user) => ({
      id: user.userId,
      email: user.email,
      displayName: user.displayName,
    })))
  }, [availability?.users])

  function addUser(user: User) {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user])
    }
    setSearch('')
  }

  function removeUser(id: string) {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== id))
  }

  function handleQuery() {
    setError('')
    if (selectedUsers.length === 0) {
      setError('Select at least one user')
      return
    }
    setQueryParams({
      userIds: selectedUsers.map((u) => u.id),
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
    })
  }

  return (
    <div>
      <PageHeader
        title="Availability"
        description="Users need a Free time slot to be invited to a meeting. No slots or only Busy slots means unavailable."
      />

      {focusWindow && (
        <div className="mb-4 rounded-md border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-foreground)]">
          Checking availability for meeting time{' '}
          <span className="font-medium">
            {format(new Date(focusWindow.start), 'MMM d HH:mm')} – {format(new Date(focusWindow.end), 'HH:mm')}
          </span>
          . A participant is available only if they have a <span className="font-medium">Free</span> slot overlapping that window.
        </div>
      )}

      <div className="mb-6 rounded-lg border border-[var(--color-border)] p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search users</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..." />
            {searchResults.length > 0 && (
              <div className="rounded-md border border-[var(--color-border)]">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => addUser(user)}
                    className="flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-accent)]"
                  >
                    {user.displayName} <span className="ml-2 text-[var(--color-muted-foreground)]">{user.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <span key={user.id} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-secondary)] px-3 py-1 text-sm">
                  {user.displayName}
                  <button type="button" onClick={() => removeUser(user.id)} className="ml-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">×</button>
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {error && <ApiErrorAlert message={error} />}

          <Button onClick={handleQuery} disabled={isFetching}>
            {isFetching ? 'Querying...' : 'Query availability'}
          </Button>
        </div>
      </div>

      {!queryParams ? (
        <EmptyState title="Select users and a date range" description="Search for users and click Query availability to see their busy times." />
      ) : isLoading ? (
        <div className="h-48 animate-pulse rounded-lg bg-[var(--color-muted)]" />
      ) : isError ? (
        <ApiErrorAlert message={getErrorMessage(queryError)} />
      ) : availability ? (
        <div className="space-y-4">
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-[var(--color-free)]/40" /> Free</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-[var(--color-busy)]/40" /> Busy</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-[var(--color-meeting)]/40" /> Meeting</span>
          </div>
          {availability.users.map((user) => (
            <div key={user.userId} className="rounded-lg border border-[var(--color-border)] p-4">
              <div className="mb-3 font-medium">{user.displayName} <span className="text-sm text-[var(--color-muted-foreground)]">{user.email}</span></div>
              <UserAvailabilitySummary
                intervals={user.busyIntervals}
                hasFreeSlotInRange={user.hasFreeSlotInRange ?? user.busyIntervals.some((i) => i.status === 'FREE' && !i.meetingId)}
                focusWindow={focusWindow}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function overlapsWindow(interval: BusyInterval, start: string, end: string) {
  return interval.startAt < end && interval.endAt > start
}

function isBookableFree(interval: BusyInterval) {
  return interval.status === 'FREE' && !interval.meetingId
}

function UserAvailabilitySummary({
  intervals,
  hasFreeSlotInRange,
  focusWindow,
}: {
  intervals: BusyInterval[]
  hasFreeSlotInRange: boolean
  focusWindow: { start: string; end: string } | null
}) {
  const focusIntervals = focusWindow
    ? intervals.filter((interval) => overlapsWindow(interval, focusWindow.start, focusWindow.end))
    : []
  const availableAtFocus = focusWindow
    ? focusIntervals.some(isBookableFree)
    : null

  let summary: { tone: 'free' | 'warn' | 'busy'; text: string }
  if (intervals.length === 0) {
    summary = {
      tone: 'warn',
      text: 'No time slots in this range — has not marked any availability.',
    }
  } else if (!hasFreeSlotInRange) {
    summary = {
      tone: 'busy',
      text: 'No free time slots in this range.',
    }
  } else {
    summary = {
      tone: 'free',
      text: 'Has free time slots in this range.',
    }
  }

  return (
    <div className="space-y-2">
      <p className={cn(
        'text-sm',
        summary.tone === 'free' && 'text-[var(--color-free)]',
        summary.tone === 'warn' && 'text-[var(--color-primary)]',
        summary.tone === 'busy' && 'text-[var(--color-busy)]',
      )}>
        {summary.text}
      </p>

      {focusWindow && availableAtFocus === false && (
        <p className="text-sm text-[var(--color-primary)]">
          Not available at the meeting time ({format(new Date(focusWindow.start), 'MMM d HH:mm')} – {format(new Date(focusWindow.end), 'HH:mm')}).
        </p>
      )}

      {intervals.length > 0 && (
        <div className="space-y-1">
          {intervals.map((interval, i) => (
            <div
              key={i}
              className={cn(
                'rounded px-3 py-2 text-sm',
                interval.meetingId ? 'bg-[var(--color-meeting)]/15 text-[var(--color-meeting)]' :
                interval.status === 'BUSY' ? 'bg-[var(--color-busy)]/15' : 'bg-[var(--color-free)]/15',
              )}
            >
              {format(new Date(interval.startAt), 'MMM d HH:mm')} – {format(new Date(interval.endAt), 'HH:mm')}
              {interval.meetingTitle && ` · ${interval.meetingTitle}`}
              {interval.status === 'FREE' && !interval.meetingId && ' · Free'}
              {interval.status === 'BUSY' && !interval.meetingId && ' · Busy'}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
