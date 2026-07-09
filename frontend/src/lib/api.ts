import axios, { type AxiosError } from 'axios'
import type {
  AuthResponse,
  AvailabilityResponse,
  Meeting,
  Slot,
  User,
} from '@/types'

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase()
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = getCsrfToken()
    if (csrf) {
      config.headers['X-XSRF-TOKEN'] = csrf
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(error),
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
  list: () => api.get<Meeting[]>('/meetings').then((r) => r.data),
  get: (id: string) => api.get<Meeting>(`/meetings/${id}`).then((r) => r.data),
  book: (slotId: string, data: { title: string; description?: string; participantEmails?: string[] }) =>
    api.post<Meeting>(`/slots/${slotId}/meeting`, data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Meeting>(`/meetings/${id}`, data).then((r) => r.data),
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
