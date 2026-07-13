import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buildAvailabilityUrl } from '@/lib/availability-url'
import { getErrorMessage, meetingsApi, slotsApi } from '@/lib/api'
import type { Meeting, Slot } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiErrorAlert, EmptyState, PageHeader, StatusBadge } from '@/components/shared'
import { cn } from '@/lib/utils'

type Filter = 'ALL' | 'FREE' | 'BUSY' | 'MEETING'

export function SchedulePage() {
  const queryClient = useQueryClient()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [view, setView] = useState<'week' | 'list'>('week')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showBook, setShowBook] = useState(false)
  const [error, setError] = useState('')

  const rangeStart = weekStart.toISOString()
  const rangeEnd = endOfWeek(weekStart, { weekStartsOn: 1 }).toISOString()

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['slots', rangeStart, rangeEnd],
    queryFn: () => slotsApi.list(rangeStart, addDays(endOfWeek(weekStart, { weekStartsOn: 1 }), 1).toISOString()),
  })

  const filteredSlots = slots.filter((slot) => {
    if (filter === 'FREE') return slot.status === 'FREE' && !slot.meetingId
    if (filter === 'BUSY') return slot.status === 'BUSY' && !slot.meetingId
    if (filter === 'MEETING') return !!slot.meetingId
    return true
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => slotsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['slots'] })
      setSelectedSlot(null)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => slotsApi.updateStatus(id, status),
    onSuccess: (updated) => {
      setSelectedSlot(updated)
      void queryClient.invalidateQueries({ queryKey: ['slots'] })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const drawerSlot = selectedSlot
    ? slots.find((s) => s.id === selectedSlot.id) ?? selectedSlot
    : null

  return (
    <div>
      <PageHeader
        title="My Schedule"
        description="Manage your time slots"
        action={
          <Button onClick={() => { setShowCreate(true); setError('') }}>
            <Plus className="h-4 w-4" />
            New time slot
          </Button>
        }
      />

      {error && <div className="mb-4"><ApiErrorAlert message={error} /></div>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-[var(--color-border)]">
          <Button variant={view === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setView('week')}>Week</Button>
          <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')}>List</Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 text-sm text-[var(--color-muted-foreground)]">{format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}</span>
        </div>
        <div className="flex gap-1">
          {(['ALL', 'FREE', 'BUSY', 'MEETING'] as Filter[]).map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'MEETING' ? 'With meeting' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-[var(--color-muted)]" />
      ) : filteredSlots.length === 0 ? (
        <EmptyState
          title="No time slots yet"
          description="Create your first time slot to start managing your availability."
          action={<Button onClick={() => setShowCreate(true)}>Create your first slot</Button>}
        />
      ) : view === 'list' ? (
        <div className="space-y-2">
          {filteredSlots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] p-4 text-left hover:bg-[var(--color-accent)]"
            >
              <div>
                <div className="font-medium">{format(new Date(slot.startAt), 'EEE, MMM d · HH:mm')} – {format(new Date(slot.endAt), 'HH:mm')}</div>
                <div className="text-sm text-[var(--color-muted-foreground)]">{slot.durationMinutes} min</div>
              </div>
              <StatusBadge status={slot.status} meetingId={slot.meetingId} />
            </button>
          ))}
        </div>
      ) : (
        <WeekGrid weekStart={weekStart} slots={filteredSlots} onSelect={setSelectedSlot} />
      )}

      {drawerSlot && (
        <SlotDetailDrawer
          slot={drawerSlot}
          isTogglingStatus={toggleStatusMutation.isPending}
          onClose={() => setSelectedSlot(null)}
          onEdit={() => { setShowCreate(true); setSelectedSlot(null) }}
          onBook={() => setShowBook(true)}
          onDelete={() => deleteMutation.mutate(drawerSlot.id)}
          onToggleStatus={() =>
            toggleStatusMutation.mutate({
              id: drawerSlot.id,
              status: drawerSlot.status === 'FREE' ? 'BUSY' : 'FREE',
            })
          }
        />
      )}

      <SlotFormDialog
        open={showCreate}
        slot={selectedSlot}
        onClose={() => { setShowCreate(false); setSelectedSlot(null) }}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['slots'] })
          setShowCreate(false)
          setSelectedSlot(null)
        }}
        onError={setError}
      />

      {selectedSlot && (
        <BookMeetingDialog
          open={showBook}
          slot={selectedSlot}
          onClose={() => setShowBook(false)}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ['slots'] })
            void queryClient.invalidateQueries({ queryKey: ['meetings'] })
            setShowBook(false)
            setSelectedSlot(null)
          }}
          onError={setError}
        />
      )}
    </div>
  )
}

function WeekGrid({ weekStart, slots, onSelect }: { weekStart: Date; slots: Slot[]; onSelect: (s: Slot) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const daySlots = slots.filter((s) => format(new Date(s.startAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
        return (
          <div key={day.toISOString()} className="min-h-32 rounded-lg border border-[var(--color-border)] p-2">
            <div className="mb-2 text-center text-xs font-medium text-[var(--color-muted-foreground)]">{format(day, 'EEE d')}</div>
            <div className="space-y-1">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onSelect(slot)}
                  className={cn(
                    'w-full rounded px-1 py-0.5 text-left text-xs',
                    slot.meetingId ? 'bg-[var(--color-meeting)]/20 text-[var(--color-meeting)]' :
                    slot.status === 'FREE' ? 'bg-[var(--color-free)]/20 text-[var(--color-free)]' :
                    'bg-[var(--color-busy)]/20 text-[var(--color-busy)]',
                  )}
                >
                  {format(new Date(slot.startAt), 'HH:mm')}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SlotDetailDrawer({ slot, isTogglingStatus, onClose, onEdit, onBook, onDelete, onToggleStatus }: {
  slot: Slot
  isTogglingStatus?: boolean
  onClose: () => void
  onEdit: () => void
  onBook: () => void
  onDelete: () => void
  onToggleStatus: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="h-full w-full max-w-md bg-[var(--color-background)] p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Time slot details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <StatusBadge status={slot.status} meetingId={slot.meetingId} />
        <div className="mt-4 space-y-2">
          <p className="text-2xl font-semibold">{format(new Date(slot.startAt), 'EEE, MMM d')}</p>
          <p>{format(new Date(slot.startAt), 'HH:mm')} – {format(new Date(slot.endAt), 'HH:mm')}</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">{slot.durationMinutes} minutes</p>
        </div>
        {slot.meetingId && (
          <Link to={`/meetings/${slot.meetingId}`} className="mt-4 block text-sm text-[var(--color-meeting)] hover:underline">
            View meeting →
          </Link>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={onEdit}>Edit</Button>
          {!slot.meetingId && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isTogglingStatus}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleStatus()
                }}
              >
                {isTogglingStatus ? 'Updating...' : `Mark as ${slot.status === 'FREE' ? 'Busy' : 'Free'}`}
              </Button>
              {slot.status === 'FREE' && (
                <Button type="button" onClick={onBook}>Book meeting</Button>
              )}
            </>
          )}
          <Button type="button" variant="destructive" onClick={onDelete}>Delete</Button>
        </div>
      </div>
    </div>
  )
}

function SlotFormDialog({ open, slot, onClose, onSuccess, onError }: {
  open: boolean; slot: Slot | null; onClose: () => void; onSuccess: () => void; onError: (m: string) => void
}) {
  const [startAt, setStartAt] = useState('')
  const [duration, setDuration] = useState(60)
  const [status, setStatus] = useState<'FREE' | 'BUSY'>('FREE')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const isoStart = new Date(startAt).toISOString()
      if (slot) {
        await slotsApi.update(slot.id, { startAt: isoStart, durationMinutes: duration, status })
      } else {
        await slotsApi.create({ startAt: isoStart, durationMinutes: duration, status })
      }
      onSuccess()
    } catch (err) {
      onError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{slot ? 'Edit time slot' : 'New time slot'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label>Start date & time</Label>
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map((d) => (
                <Button key={d} type="button" variant={duration === d ? 'default' : 'outline'} size="sm" onClick={() => setDuration(d)}>{d}</Button>
              ))}
              <Input type="number" min={15} max={480} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex gap-2">
              <Button type="button" variant={status === 'FREE' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('FREE')}>Free</Button>
              <Button type="button" variant={status === 'BUSY' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('BUSY')}>Busy</Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BookMeetingDialog({ open, slot, onClose, onSuccess, onError }: {
  open: boolean; slot: Slot; onClose: () => void; onSuccess: () => void; onError: (m: string) => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emails, setEmails] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const meeting = await meetingsApi.book(slot.id, {
        title,
        description: description || undefined,
        participantEmails: emails.split(',').map((e) => e.trim()).filter(Boolean),
      })
      if ((meeting.unavailableParticipants ?? []).length > 0) {
        setCreatedMeeting(meeting)
      } else {
        onSuccess()
      }
    } catch (err) {
      onError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelMeeting() {
    if (!createdMeeting) return
    setLoading(true)
    try {
      await meetingsApi.cancel(createdMeeting.id)
      void queryClient.invalidateQueries({ queryKey: ['slots'] })
      void queryClient.invalidateQueries({ queryKey: ['meetings'] })
      setCreatedMeeting(null)
      onClose()
    } catch (err) {
      onError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleKeepMeeting() {
    setCreatedMeeting(null)
    onSuccess()
  }

  if (createdMeeting) {
    const unavailable = createdMeeting.unavailableParticipants
    const availabilityUrl = buildAvailabilityUrl(unavailable, createdMeeting.startAt, createdMeeting.endAt)

    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleKeepMeeting()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Some participants may be unavailable</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border px-4 py-3 text-sm mb-2">
            <p className="font-medium text-[var(--color-blue)]">
              The meeting was created, but these users are not available at the selected time and were saved as{' '}
              <span className="font-semibold">Invited but busy</span> (they will not see this meeting in their calendar):
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--color-blue)]">
              {unavailable.map((participant) => (
                <li key={participant.userId}>
                  {participant.displayName} ({participant.email})
                </li>
              ))}
            </ul>
            <p className="mt-3">
              <a
                href={availabilityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--color-blue)] underline underline-offset-2 hover:opacity-80"
              >
                Check their availability here
              </a>
              {' '}(opens in a new tab)
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="destructive" onClick={() => void handleCancelMeeting()} disabled={loading}>
              {loading ? 'Cancelling...' : 'Cancel meeting'}
            </Button>
            <Button type="button" onClick={handleKeepMeeting}>
              Keep meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book meeting</DialogTitle>
        </DialogHeader>
        <div className="rounded-md bg-[var(--color-muted)] p-3 text-sm">
          {format(new Date(slot.startAt), 'EEE, MMM d · HH:mm')} – {format(new Date(slot.endAt), 'HH:mm')} ({slot.durationMinutes} min)
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2">
            <Label>Meeting title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              className="flex min-h-20 w-full rounded-md border border-[var(--color-input)] bg-transparent px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Participants (comma-separated emails)</Label>
            <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="bob@example.com, carol@example.com" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Scheduling...' : 'Schedule meeting'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
