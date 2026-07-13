import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { getErrorMessage, meetingsApi } from '@/lib/api'
import { editMeetingSchema, parseParticipantEmails } from '@/lib/schemas'
import { partitionParticipants } from '@/lib/meeting-participants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiErrorAlert, PageHeader, StatusBadge } from '@/components/shared'
import { cn } from '@/lib/utils'

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)
  const [error, setError] = useState('')

  const { data: meeting, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['meetings', id],
    queryFn: () => meetingsApi.get(id!),
    enabled: !!id,
  })

  const cancelMutation = useMutation({
    mutationFn: () => meetingsApi.cancel(id!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meetings'] })
      void queryClient.invalidateQueries({ queryKey: ['slots'] })
      navigate('/meetings')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  if (isLoading) return <div className="h-32 animate-pulse rounded-lg bg-[var(--color-muted)]" />

  if (isError) {
    return (
      <div>
        <ApiErrorAlert message={getErrorMessage(queryError)} />
      </div>
    )
  }

  if (!meeting) return <div>Meeting not found</div>

  const { invitedParticipants, busyInvites } = partitionParticipants(meeting)

  return (
    <div>
      <PageHeader
        title={meeting.title}
        description={format(new Date(meeting.startAt), 'EEE, MMM d · HH:mm') + ' – ' + format(new Date(meeting.endAt), 'HH:mm')}
        action={
          meeting.role === 'ORGANIZER' && meeting.status === 'SCHEDULED' ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEdit(true)}>Edit</Button>
              <Button variant="destructive" onClick={() => cancelMutation.mutate()}>Cancel meeting</Button>
            </div>
          ) : undefined
        }
      />

      {error && <div className="mb-4"><ApiErrorAlert message={error} /></div>}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-border)] p-6">
          <StatusBadge status="BUSY" meetingId={meeting.status === 'SCHEDULED' ? meeting.id : null} />
          <h3 className="mt-4 font-semibold">Details</h3>
          {meeting.description && <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{meeting.description}</p>}
          <p className="mt-4 text-sm">Organizer: <span className="font-medium">{meeting.organizerName}</span></p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] p-6">
          <h3 className="font-semibold">Participants ({invitedParticipants.length})</h3>
          <ul className="mt-4 space-y-2">
            {invitedParticipants.map((p) => (
              <ParticipantRow key={p.id} participant={p} />
            ))}
            {invitedParticipants.length === 0 && (
              <li className="text-sm text-[var(--color-muted-foreground)]">No confirmed participants</li>
            )}
          </ul>

          {busyInvites.length > 0 && (
            <>
              <h3 className="mt-6 font-semibold">Invited but busy ({busyInvites.length})</h3>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                These users were invited but have no free slot at this time. They can still view the meeting.
              </p>
              <ul className="mt-4 space-y-2">
                {busyInvites.map((p) => (
                  <ParticipantRow key={p.id} participant={p} busy />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {showEdit && (
        <EditMeetingDialog
          meeting={meeting}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ['meetings', id] })
            setShowEdit(false)
          }}
          onError={setError}
        />
      )}
    </div>
  )
}

function ParticipantRow({ participant, busy = false }: {
  participant: { displayName: string | null; email: string }
  busy?: boolean
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
        busy ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-muted)]',
      )}>
        {(participant.displayName || participant.email).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{participant.displayName || participant.email}</span>
          {busy && (
            <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
              Invited but busy
            </span>
          )}
        </div>
        {participant.displayName && (
          <div className="text-xs text-[var(--color-muted-foreground)]">{participant.email}</div>
        )}
      </div>
    </li>
  )
}

function EditMeetingDialog({ meeting, onClose, onSuccess, onError }: {
  meeting: { id: string; title: string; description: string | null; participants: { email: string }[] }
  onClose: () => void; onSuccess: () => void; onError: (m: string) => void
}) {
  const [title, setTitle] = useState(meeting.title)
  const [description, setDescription] = useState(meeting.description || '')
  const [emails, setEmails] = useState(meeting.participants.map((p) => p.email).join(', '))
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = editMeetingSchema.safeParse({ title, description, participantEmails: emails })
    if (!parsed.success) {
      onError(parsed.error.issues[0]?.message ?? 'Invalid form data')
      return
    }
    setLoading(true)
    try {
      await meetingsApi.update(meeting.id, {
        title: parsed.data.title,
        description: parsed.data.description,
        participantEmails: parseParticipantEmails(parsed.data.participantEmails),
      })
      onSuccess()
    } catch (err) {
      onError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit meeting</DialogTitle></DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="space-y-2"><Label>Description</Label>
            <textarea className="flex min-h-20 w-full rounded-md border border-[var(--color-input)] px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2"><Label>Participants</Label><Input value={emails} onChange={(e) => setEmails(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
