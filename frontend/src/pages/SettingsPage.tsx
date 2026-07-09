import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { authApi, getErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiErrorAlert, PageHeader } from '@/components/shared'

export function SettingsPage() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.updateProfile(displayName)
      await refreshUser()
      setMessage('Profile updated')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setMessage('Password changed')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account" />

      {message && <div className="mb-4 rounded-md bg-[var(--color-free)]/10 px-4 py-3 text-sm text-[var(--color-free)]">{message}</div>}
      {error && <div className="mb-4"><ApiErrorAlert message={error} /></div>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your display name</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleProfileSave(e)} className="space-y-4">
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="opacity-60" />
              </div>
              <Button type="submit" disabled={loading}>Save profile</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handlePasswordChange(e)} className="space-y-4">
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
              <Button type="submit" disabled={loading}>Change password</Button>
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
