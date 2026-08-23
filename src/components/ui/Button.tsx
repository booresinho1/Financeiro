import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: ReactNode
}

const estilos = {
  primary:
    'bg-brand text-white hover:bg-brand-hover shadow-sm shadow-black/10',
  secondary:
    'bg-surface text-ink-soft border border-line hover:bg-surface-2',
  ghost: 'text-ink-soft hover:bg-surface-2',
}

export function Button({
  variant = 'primary',
  icon,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${estilos[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
