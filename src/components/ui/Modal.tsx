import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg'
}

const LARGURA = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
}

export function Modal({ title, subtitle, onClose, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onClose])

  return (
    <div className="animate-escurecer fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-sm p-0 sm:p-4">
      <button aria-label="Fechar" className="absolute inset-0" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-aparecer relative w-full ${LARGURA[size]} rounded-t-3xl sm:rounded-3xl bg-surface p-6 max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-900/25 ring-1 ring-line`}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h3 className="text-lg font-bold tracking-tight text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-faint">{subtitle}</p>}
          </div>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink-soft"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
