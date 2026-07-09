import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CalendarDays, Clock, LogOut, Menu, Settings, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/meetings', label: 'Meetings', icon: Clock },
  { to: '/availability', label: 'Availability', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] md:flex">
        <div className="flex h-16 items-center border-b border-[var(--color-border)] px-6">
          <span className="text-lg font-bold">Mini Doodle</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-[var(--color-border)] p-4">
          <div className="mb-2 truncate text-sm font-medium">{user?.displayName}</div>
          <div className="mb-3 truncate text-xs text-[var(--color-muted-foreground)]">{user?.email}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[var(--color-border)] px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="font-bold">Mini Doodle</span>
          </div>
          <div className="hidden md:block" />
          <div className="text-sm text-[var(--color-muted-foreground)]">{user?.displayName}</div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>

        <nav className="flex border-t border-[var(--color-border)] md:hidden">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2 text-xs',
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
