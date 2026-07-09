import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addDays, format } from 'date-fns'
import { availabilityApi, usersApi } from '@/lib/api'
import type { User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiErrorAlert, EmptyState, PageHeader } from '@/components/shared'
import { cn } from '@/lib/utils'

export function AvailabilityPage() {
  const [search, setSearch] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [from, setFrom] = useState(format(new Date(), "yyyy-MM-dd'T'00:00"))
  const [to, setTo] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd'T'23:59"))
  const [error, setError] = useState('')
  const [queryParams, setQueryParams] = useState<{ userIds: string[]; from: string; to: string } | null>(null)

  const { data: searchResults = [] } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.search(search),
    enabled: search.length >= 2,
  })

  const { data: availability, isLoading, isFetching } = useQuery({
    queryKey: ['availability', queryParams],
    queryFn: () => availabilityApi.query(queryParams!.userIds, queryParams!.from, queryParams!.to),
    enabled: !!queryParams,
  })

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
      <PageHeader title="Availability" description="View aggregated free/busy across users" />

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
              {user.busyIntervals.length === 0 ? (
                <p className="text-sm text-[var(--color-free)]">Fully available in this range</p>
              ) : (
                <div className="space-y-1">
                  {user.busyIntervals.map((interval, i) => (
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
