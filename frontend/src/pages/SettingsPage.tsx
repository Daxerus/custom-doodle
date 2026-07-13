import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { authApi, getErrorMessage } from '@/lib/api'
import { changePasswordSchema, profileSchema } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiErrorAlert, PageHeader } from '@/components/shared'

export function SettingsPage() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName)
    }
  }, [user?.displayName])

  const profileMutation = useMutation({
    mutationFn: (name: string) => authApi.updateProfile(name),
    onSuccess: async () => {
      await refreshUser()
      setMessage('Profile updated')
      setProfileError('')
    },
    onError: (err) => setProfileError(getErrorMessage(err)),
  })

  const passwordMutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      authApi.changePassword(current, next),
    onSuccess: () => {
      setMessage('Password changed')
      setPasswordError('')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err) => setPasswordError(getErrorMessage(err)),
  })

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    const parsed = profileSchema.safeParse({ displayName })
    if (!parsed.success) {
      setProfileError(parsed.error.issues[0]?.message ?? 'Invalid form data')
      return
    }
    profileMutation.mutate(parsed.data.displayName)
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword })
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message ?? 'Invalid form data')
      return
    }
    passwordMutation.mutate({ current: parsed.data.currentPassword, next: parsed.data.newPassword })
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account" />

      {message && <div className="mb-4 rounded-md bg-[var(--color-free)]/10 px-4 py-3 text-sm text-[var(--color-free)]">{message}</div>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSave} className="space-y-4">
              {profileError && <ApiErrorAlert message={profileError} />}
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="opacity-60" />
              </div>
              <Button type="submit" disabled={profileMutation.isPending}>
                {profileMutation.isPending ? 'Saving...' : 'Save profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordError && <ApiErrorAlert message={passwordError} />}
              <div className="space-y-2">
                <Label>Current password</Label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? 'Changing...' : 'Change password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Button variant="outline" onClick={() => void handleLogout()}>Logout</Button>
        <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">Mini Doodle v0.1.0</p>
      </div>
    </div>
  )
}
