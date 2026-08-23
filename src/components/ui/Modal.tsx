import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-0 sm:p-4">
      <button aria-label="Fechar" className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-surface p-6 max-h-[90vh] overflow-y-auto shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold tracking-tight text-ink">{title}</h3>
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
