import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[var(--color-muted-foreground)]">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-16 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-muted-foreground)]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function ApiErrorAlert({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-4 py-3 text-sm text-[var(--color-destructive)]">
      {message}
    </div>
  )
}

export function StatusBadge({ status, meetingId }: { status: string; meetingId?: string | null }) {
  if (meetingId) return <span className={cn('inline-flex rounded-full bg-[var(--color-meeting)]/20 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-meeting)]')}>Scheduled</span>
  if (status === 'FREE') return <span className="inline-flex rounded-full bg-[var(--color-free)]/20 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-free)]">Free</span>
  return <span className="inline-flex rounded-full bg-[var(--color-busy)]/20 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-busy)]">Busy</span>
}
