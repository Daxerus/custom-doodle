import { useEffect, useState } from 'react'
import { getErrorMessage, slotsApi } from '@/lib/api'
import { slotFormSchema, toDatetimeLocalValue } from '@/lib/schemas'
import type { Slot } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function SlotFormDialog({ open, slot, onClose, onSuccess, onError }: {
  open: boolean
  slot: Slot | null
  onClose: () => void
  onSuccess: () => void
  onError: (m: string) => void
}) {
  const [startAt, setStartAt] = useState('')
  const [duration, setDuration] = useState(60)
  const [status, setStatus] = useState<'FREE' | 'BUSY'>('FREE')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    if (slot) {
      setStartAt(toDatetimeLocalValue(slot.startAt))
      setDuration(slot.durationMinutes)
      setStatus(slot.status)
    } else {
      setStartAt('')
      setDuration(60)
      setStatus('FREE')
    }
  }, [open, slot])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = slotFormSchema.safeParse({ startAt, durationMinutes: duration, status })
    if (!parsed.success) {
      onError(parsed.error.issues[0]?.message ?? 'Invalid form data')
      return
    }
    setLoading(true)
    try {
      const isoStart = new Date(parsed.data.startAt).toISOString()
      if (slot) {
        await slotsApi.update(slot.id, {
          startAt: isoStart,
          durationMinutes: parsed.data.durationMinutes,
          status: parsed.data.status,
        })
      } else {
        await slotsApi.create({
          startAt: isoStart,
          durationMinutes: parsed.data.durationMinutes,
          status: parsed.data.status,
        })
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
