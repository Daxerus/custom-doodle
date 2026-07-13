import { format } from 'date-fns'
import { buildAvailabilityUrl } from '@/lib/availability-url'
import { getErrorMessage, meetingsApi } from '@/lib/api'
import { bookMeetingSchema, parseParticipantEmails } from '@/lib/schemas'
import type { Meeting, Slot } from '@/types'
import { ParticipantEmailPicker } from '@/components/ParticipantEmailPicker'
import type { ParticipantInvite } from '@/components/ParticipantEmailPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export function BookMeetingDialog({ open, slot, onClose, onSuccess, onError }: {
  open: boolean
  slot: Slot
  onClose: () => void
  onSuccess: () => void
  onError: (m: string) => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [participants, setParticipants] = useState<ParticipantInvite[]>([])
  const [loading, setLoading] = useState(false)
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null)

  useEffect(() => {
    if (open && !createdMeeting) {
      setTitle('')
      setDescription('')
      setParticipants([])
    }
  }, [open, createdMeeting])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = bookMeetingSchema.safeParse({
      title,
      description,
      participantEmails: participants.map((p) => p.email).join(', '),
    })
    if (!parsed.success) {
      onError(parsed.error.issues[0]?.message ?? 'Invalid form data')
      return
    }
    setLoading(true)
    try {
      const meeting = await meetingsApi.book(slot.id, {
        title: parsed.data.title,
        description: parsed.data.description,
        participantEmails: parseParticipantEmails(parsed.data.participantEmails),
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
          <div className="rounded-md border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-4 py-3 text-sm">
            <p className="font-medium text-[var(--color-foreground)]">
              The meeting was created, but these users are not available at the selected time and were saved as{' '}
              <span className="font-semibold text-[var(--color-primary)]">Invited but busy</span>:
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--color-foreground)]">
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
                className="font-medium text-[var(--color-primary)] underline underline-offset-2 hover:opacity-80"
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
          <ParticipantEmailPicker value={participants} onChange={setParticipants} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Scheduling...' : 'Schedule meeting'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
