import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { MoreHorizontal, X, LogOut } from 'lucide-react'
import { mobilePrimaryNavItems, navItems, EMAIL_MASTER } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { user, sair } = useAuth()
  const overflowItems = navItems.filter(
    (item) =>
      !mobilePrimaryNavItems.includes(item) && (!item.masterOnly || user?.email === EMAIL_MASTER)
  )

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end bg-slate-900/40">
          <button
            aria-label="Fechar"
            className="flex-1"
            onClick={() => setMoreOpen(false)}
          />
          <div className="rounded-t-2xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
            <div className="grid grid-cols-2 gap-2">
              {overflowItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium',
                      isActive
                        ? 'bg-brand-soft text-brand'
                        : 'bg-surface-2 text-ink-soft',
                    ].join(' ')
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
            <button
              onClick={sair}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-3 mt-2 text-sm font-medium bg-surface-2 text-ink-soft"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Sair
            </button>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {mobilePrimaryNavItems.map(({ to, label, icon: Icon }) => (
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
            <MoreHorizontal className="h-5 w-5" />
            Mais
          </button>
        </div>
      </nav>
    </>
  )
}
