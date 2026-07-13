import { addDays, format } from 'date-fns'
import type { Slot } from '@/types'
import { cn } from '@/lib/utils'

export function WeekGrid({ weekStart, slots, onSelect }: { weekStart: Date; slots: Slot[]; onSelect: (s: Slot) => void }) {
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
