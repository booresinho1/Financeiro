import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-line bg-surface py-16 px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 mb-3.5">
        <Icon className="h-5.5 w-5.5 text-ink-faint" strokeWidth={1.75} />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>
    </div>
  )
}
