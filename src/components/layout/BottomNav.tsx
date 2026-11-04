import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutGrid, X, LogOut, Plus } from 'lucide-react'
import { IconeNav } from '@/components/layout/IconeNav'
import {
  mobilePrimaryNavItems,
  navItems,
  EMAIL_MASTER,
  NOME_GRUPO,
  ORDEM_GRUPOS,
} from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface BottomNavProps {
  onNovaDespesa: () => void
}

export function BottomNav({ onNovaDespesa }: BottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const { user, sair } = useAuth()
  const overflowItems = navItems.filter(
    (item) =>
      !mobilePrimaryNavItems.includes(item) && (!item.masterOnly || user?.email === EMAIL_MASTER)
  )
  const [antes, depois] = [mobilePrimaryNavItems.slice(0, 2), mobilePrimaryNavItems.slice(2)]

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end bg-slate-900/40">
          <button
            aria-label="Fechar"
            className="flex-1"
            onClick={() => setMoreOpen(false)}
          />
          <div className="sem-barra max-h-[85vh] overflow-y-auto rounded-t-3xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-ink">Mais opções</span>
              <button
                aria-label="Fechar"
                onClick={() => setMoreOpen(false)}
                className="p-1 text-ink-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              {ORDEM_GRUPOS.map((grupo) => {
                const itensDoGrupo = overflowItems.filter((item) => item.grupo === grupo)
                if (itensDoGrupo.length === 0) return null
                return (
                  <div key={grupo}>
                    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                      {NOME_GRUPO[grupo]}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {itensDoGrupo.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMoreOpen(false)}
                          className={({ isActive }) =>
                            [
                              'flex min-w-0 items-center gap-2.5 rounded-2xl p-2 text-sm font-medium',
                              isActive
                                ? 'bg-brand-soft font-semibold text-brand'
                                : 'bg-surface-2/60 text-ink-soft',
                            ].join(' ')
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <IconeNav item={item} ativo={isActive} tamanho="md" />
                              <span className="min-w-0 truncate">{item.label}</span>
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={sair}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-line px-3 py-3 text-sm font-medium text-ink-muted"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              Sair
            </button>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {antes.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium',
                  isActive ? 'text-brand' : 'text-ink-muted',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}

          <div className="flex items-center justify-center">
            <button
              onClick={onNovaDespesa}
              aria-label="Nova despesa"
              className="relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-black/40 ring-4 ring-app hover:bg-brand-hover"
            >
              <Plus className="h-6 w-6" strokeWidth={2.4} />
            </button>
          </div>

          {depois.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium',
                  isActive ? 'text-brand' : 'text-ink-muted',
                ].join(' ')
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-ink-muted"
          >
            <LayoutGrid className="h-5 w-5" />
            Mais
          </button>
        </div>
      </nav>
    </>
  )
}
