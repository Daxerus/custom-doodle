import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
        secondary: 'border-transparent bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
        free: 'border-transparent bg-[var(--color-free)]/20 text-[var(--color-free)]',
        busy: 'border-transparent bg-[var(--color-busy)]/20 text-[var(--color-busy)]',
        meeting: 'border-transparent bg-[var(--color-meeting)]/20 text-[var(--color-meeting)]',
        destructive: 'border-transparent bg-[var(--color-destructive)]/20 text-[var(--color-destructive)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
