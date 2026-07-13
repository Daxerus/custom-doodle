import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { getErrorMessage, slotsApi } from '@/lib/api'
import type { Slot } from '@/types'
import { Button } from '@/components/ui/button'
import { ApiErrorAlert, EmptyState, PageHeader, StatusBadge } from '@/components/shared'
import { BookMeetingDialog } from '@/components/schedule/BookMeetingDialog'
import { SlotDetailDrawer } from '@/components/schedule/SlotDetailDrawer'
import { SlotFormDialog } from '@/components/schedule/SlotFormDialog'
import { WeekGrid } from '@/components/schedule/WeekGrid'

type Filter = 'ALL' | 'FREE' | 'BUSY' | 'MEETING'

export function SchedulePage() {
  const queryClient = useQueryClient()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [view, setView] = useState<'week' | 'list'>('week')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showBook, setShowBook] = useState(false)
  const [error, setError] = useState('')

  const rangeStart = weekStart.toISOString()
  const rangeEnd = addDays(endOfWeek(weekStart, { weekStartsOn: 1 }), 1).toISOString()

  const { data: slotsPage, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['slots', rangeStart, rangeEnd],
    queryFn: () => slotsApi.list(rangeStart, rangeEnd, 0, 100),
  })

  const slots = slotsPage?.content ?? []

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

  function openCreate() {
    setEditingSlot(null)
    setShowCreate(true)
    setError('')
  }

  function openEdit(slot: Slot) {
    setEditingSlot(slot)
    setShowCreate(true)
    setError('')
  }

  return (
    <div>
      <PageHeader
        title="My Schedule"
        description="Manage your time slots"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New time slot
          </Button>
        }
      />

      {(error || isError) && (
        <div className="mb-4">
          <ApiErrorAlert message={error || getErrorMessage(queryError)} />
        </div>
      )}

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
      ) : isError ? null : filteredSlots.length === 0 ? (
        <EmptyState
          title="No time slots yet"
          description="Create your first time slot to start managing your availability."
          action={<Button onClick={openCreate}>Create your first slot</Button>}
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
          onEdit={() => openEdit(drawerSlot)}
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
        slot={editingSlot}
        onClose={() => { setShowCreate(false); setEditingSlot(null) }}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['slots'] })
          setShowCreate(false)
          setEditingSlot(null)
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
