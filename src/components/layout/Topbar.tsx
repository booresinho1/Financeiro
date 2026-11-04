import { Moon, Plus, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

interface TopbarProps {
  onNovaDespesa: () => void
}

function saudacao(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function Topbar({ onNovaDespesa }: TopbarProps) {
  const { tema, alternarTema } = useTheme()
  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="h-16 bg-app/80 backdrop-blur-md flex items-center justify-between px-5 md:px-8 shrink-0 sticky top-0 z-20">
      <div className="leading-tight">
        <p className="text-[15px] font-semibold text-ink">{saudacao()}</p>
        <p className="text-xs text-ink-faint first-letter:uppercase">{hoje}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={alternarTema}
          aria-label={tema === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted hover:text-ink transition-colors"
        >
          {tema === 'dark' ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
        </button>
        <button
          type="button"
          onClick={onNovaDespesa}
          className="hidden md:flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-app hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          Nova despesa
        </button>
      </div>
    </header>
  )
}
