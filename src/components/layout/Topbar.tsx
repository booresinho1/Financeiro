import { Moon, Plus, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface TopbarProps {
  onNovaDespesa: () => void
}

export function Topbar({ onNovaDespesa }: TopbarProps) {
  const { tema, alternarTema } = useTheme()

  return (
    <header className="h-16 border-b border-line bg-surface/80 backdrop-blur-sm flex items-center justify-between px-5 md:px-8 shrink-0 sticky top-0 z-20">
      <h1 className="text-[15px] font-semibold text-ink-soft">Visão geral</h1>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNovaDespesa}
          className="hidden md:flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          Nova despesa
        </button>
        <button
          type="button"
          onClick={alternarTema}
          aria-label={tema === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
        >
          {tema === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </header>
  )
}
