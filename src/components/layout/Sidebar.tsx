import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { navItems, EMAIL_MASTER } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/logo.png'

export function Sidebar() {
  const { user, sair } = useAuth()
  const itensVisiveis = navItems.filter((item) => !item.masterOnly || user?.email === EMAIL_MASTER)
  const inicial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-line md:bg-surface md:shrink-0">
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-line-soft">
        <img src={logo} alt="Financeiro" className="h-8 w-8 rounded-lg shadow-sm shadow-black/20" />
        <span className="font-bold text-ink tracking-tight">Financeiro</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-5 px-3.5 space-y-0.5">
        {itensVisiveis.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors',
                isActive
                  ? 'bg-brand-soft text-brand'
                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
              ].join(' ')
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line-soft p-3.5">
        <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-ink-soft">
            {inicial}
          </span>
          <p className="text-xs text-ink-faint truncate">{user?.email}</p>
        </div>
        <button
          onClick={sair}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2.1} />
          Sair
        </button>
      </div>
    </aside>
  )
}
