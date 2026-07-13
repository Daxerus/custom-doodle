import { useQuery } from '@tanstack/react-query'
import { useState, type KeyboardEvent } from 'react'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'
import { usersApi } from '@/lib/api'
import type { User } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type ParticipantInvite = {
  id: string
  email: string
  displayName: string
  isGuest?: boolean
}

const emailSchema = z.string().email()

function guestId(email: string) {
  return `guest:${email.toLowerCase()}`
}

function toRegisteredInvite(user: User): ParticipantInvite {
  return { id: user.id, email: user.email, displayName: user.displayName }
}

function toGuestInvite(email: string): ParticipantInvite {
  const normalized = email.trim().toLowerCase()
  return { id: guestId(normalized), email: normalized, displayName: normalized, isGuest: true }
}

export function ParticipantEmailPicker({
  value,
  onChange,
  label = 'Participants',
  placeholder = 'Search by name or type an email...',
}: {
  value: ParticipantInvite[]
  onChange: (invites: ParticipantInvite[]) => void
  label?: string
  placeholder?: string
}) {
  const { user: currentUser } = useAuth()
  const [search, setSearch] = useState('')

  const { data: searchResults = [] } = useQuery({
    queryKey: ['users', search],
    queryFn: () => usersApi.search(search),
    enabled: search.length >= 2 && !emailSchema.safeParse(search.trim()).success,
  })

  const selectedEmails = new Set(value.map((invite) => invite.email.toLowerCase()))
  const trimmedSearch = search.trim()
  const parsedEmail = emailSchema.safeParse(trimmedSearch.toLowerCase())
  const canAddGuest =
    parsedEmail.success &&
    !selectedEmails.has(parsedEmail.data) &&
    parsedEmail.data !== currentUser?.email.toLowerCase()

  const filteredResults = searchResults.filter(
    (user) =>
      !selectedEmails.has(user.email.toLowerCase()) &&
      user.id !== currentUser?.id,
  )

  function addRegistered(user: User) {
    const email = user.email.toLowerCase()
    if (selectedEmails.has(email)) return
    onChange([...value, toRegisteredInvite(user)])
    setSearch('')
  }

  function addGuest(raw: string) {
    const parsed = emailSchema.safeParse(raw.trim().toLowerCase())
    if (!parsed.success) return
    if (selectedEmails.has(parsed.data)) return
    if (parsed.data === currentUser?.email.toLowerCase()) return
    onChange([...value, toGuestInvite(parsed.data)])
    setSearch('')
  }

  function removeInvite(id: string) {
    onChange(value.filter((invite) => invite.id !== id))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (filteredResults.length === 1) {
      addRegistered(filteredResults[0])
      return
    }
    if (canAddGuest) {
      addGuest(trimmedSearch)
    }
  }

  const showDropdown = filteredResults.length > 0 || canAddGuest

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      <p className="text-xs text-[var(--color-muted-foreground)]">
        Pick a registered user from suggestions, or type an email and press Enter to invite a guest.
      </p>
      {showDropdown && (
        <div className="rounded-md border border-[var(--color-border)]">
          {filteredResults.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => addRegistered(user)}
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-accent)]"
            >
              {user.displayName}{' '}
              <span className="ml-2 text-[var(--color-muted-foreground)]">{user.email}</span>
            </button>
          ))}
          {canAddGuest && (
            <button
              type="button"
              onClick={() => addGuest(trimmedSearch)}
              className="flex w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-accent)]"
            >
              Invite guest{' '}
              <span className="ml-1 font-medium text-[var(--color-foreground)]">{parsedEmail.data}</span>
            </button>
          )}
        </div>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((invite) => (
            <span
              key={invite.id}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--color-secondary)] px-3 py-1 text-sm"
            >
              {invite.isGuest ? invite.email : invite.displayName}
              {invite.isGuest && (
                <span className="text-xs text-[var(--color-muted-foreground)]">(guest)</span>
              )}
              <button
                type="button"
                onClick={() => removeInvite(invite.id)}
                className="ml-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                aria-label={`Remove ${invite.displayName}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function userToParticipantInvite(user: User): ParticipantInvite {
  return toRegisteredInvite(user)
}

export function participantToInvite(participant: {
  userId: string | null
  email: string
  displayName: string | null
}): ParticipantInvite {
  if (participant.userId) {
    return {
      id: participant.userId,
      email: participant.email,
      displayName: participant.displayName ?? participant.email,
    }
  }
  return toGuestInvite(participant.email)
}
