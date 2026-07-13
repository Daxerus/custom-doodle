import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { User } from '@/types'
import { authApi, getAccessToken, setAccessToken } from '@/lib/api'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (displayName: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSessionData = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me()
      setUser(me)
    } catch {
      clearSessionData()
    }
  }, [clearSessionData])

  useEffect(() => {
    async function init() {
      try {
        if (!getAccessToken()) {
          const data = await authApi.refresh()
          setAccessToken(data.accessToken)
        }
        await refreshUser()
      } catch {
        clearSessionData()
      } finally {
        setIsLoading(false)
      }
    }
    void init()
  }, [refreshUser, clearSessionData])

  const login = useCallback(async (email: string, password: string) => {
    queryClient.clear()
    const data = await authApi.login({ email, password })
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [queryClient])

  const register = useCallback(async (displayName: string, email: string, password: string) => {
    queryClient.clear()
    const data = await authApi.register({ displayName, email, password })
    setAccessToken(data.accessToken)
    setUser(data.user)
  }, [queryClient])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSessionData()
    }
  }, [clearSessionData])

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, refreshUser }),
    [user, isLoading, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
