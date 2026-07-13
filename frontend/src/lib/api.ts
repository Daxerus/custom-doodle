import axios, { type AxiosError } from 'axios'
import { normalizeMeeting } from '@/lib/meeting-participants'
import type {
  AuthResponse,
  AvailabilityResponse,
  Meeting,
  Slot,
  User,
} from '@/types'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config
    if (
      error.response?.status === 401 &&
      original &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/register') &&
      !original._retry
    ) {
      original._retry = true
      try {
        const { data } = await axios.post<AuthResponse>(
          '/api/v1/auth/refresh',
          {},
          { withCredentials: true },
        )
        setAccessToken(data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        setAccessToken(null)
      }
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: string; title?: string } | undefined
    return data?.detail || data?.title || error.message
  }
  return 'An unexpected error occurred'
}

export const authApi = {
  register: (data: { displayName: string; email: string; password: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  refresh: () => api.post<AuthResponse>('/auth/refresh').then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  updateProfile: (displayName: string) =>
    api.put<User>('/auth/me', { displayName }).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  logout: () => api.post('/auth/logout'),
}

export const slotsApi = {
  list: (from: string, to: string) =>
    api.get<Slot[]>('/slots', { params: { from, to } }).then((r) => r.data),
  get: (id: string) => api.get<Slot>(`/slots/${id}`).then((r) => r.data),
  create: (data: { startAt: string; durationMinutes: number; status: string }) =>
    api.post<Slot>('/slots', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Slot>(`/slots/${id}`, data).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch<Slot>(`/slots/${id}/status`, { status }).then((r) => r.data),
  delete: (id: string) => api.delete(`/slots/${id}`),
}

export const meetingsApi = {
  list: () => api.get<Meeting[]>('/meetings').then((r) => r.data.map(normalizeMeeting)),
  get: (id: string) => api.get<Meeting>(`/meetings/${id}`).then((r) => normalizeMeeting(r.data)),
  book: (slotId: string, data: { title: string; description?: string; participantEmails?: string[] }) =>
    api.post<Meeting>(`/slots/${slotId}/meeting`, data).then((r) => normalizeMeeting(r.data)),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Meeting>(`/meetings/${id}`, data).then((r) => normalizeMeeting(r.data)),
  cancel: (id: string) => api.delete(`/meetings/${id}`),
}

export const availabilityApi = {
  query: (userIds: string[], from: string, to: string) =>
    api
      .get<AvailabilityResponse>('/availability', {
        params: { userIds: userIds.join(','), from, to },
      })
      .then((r) => r.data),
}

export const usersApi = {
  search: (q: string) => api.get<User[]>('/users/search', { params: { q } }).then((r) => r.data),
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean
  }
}
