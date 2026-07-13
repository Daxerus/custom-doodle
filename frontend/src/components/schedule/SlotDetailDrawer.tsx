import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import type { Slot } from '@/types'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared'

export function SlotDetailDrawer({ slot, isTogglingStatus, onClose, onEdit, onBook, onDelete, onToggleStatus }: {
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
