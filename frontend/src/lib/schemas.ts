import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    displayName: z.string().min(1, 'Display name is required').max(255),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const slotFormSchema = z.object({
  startAt: z.string().min(1, 'Start date and time is required'),
  durationMinutes: z.number().int().min(15, 'Minimum 15 minutes').max(480, 'Maximum 8 hours'),
  status: z.enum(['FREE', 'BUSY']),
})

export const bookMeetingSchema = z.object({
  title: z.string().min(1, 'Meeting title is required').max(255),
  description: z.string().max(2000).optional(),
  participantEmails: z.string().optional(),
})

export const editMeetingSchema = bookMeetingSchema

export const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(255),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function parseParticipantEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return [...new Set(raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean))]
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
