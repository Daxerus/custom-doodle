import { describe, expect, it } from 'vitest'
import { loginSchema, parseParticipantEmails, registerSchema, slotFormSchema } from '@/lib/schemas'

describe('schemas', () => {
  it('validates login form', () => {
    const result = loginSchema.safeParse({ email: 'not-email', password: '' })
    expect(result.success).toBe(false)
  })

  it('validates register password confirmation', () => {
    const result = registerSchema.safeParse({
      displayName: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
      confirmPassword: 'different',
    })
    expect(result.success).toBe(false)
  })

  it('validates slot duration bounds', () => {
    const result = slotFormSchema.safeParse({
      startAt: '2026-07-15T10:00',
      durationMinutes: 10,
      status: 'FREE',
    })
    expect(result.success).toBe(false)
  })

  it('parses and deduplicates participant emails', () => {
    expect(parseParticipantEmails(' Bob@example.com, bob@example.com , ')).toEqual(['bob@example.com'])
  })
})
