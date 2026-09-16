import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { navItems, EMAIL_MASTER, type GrupoNav, type NavItem } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/logo.png'

const ORDEM_GRUPOS: GrupoNav[] = ['visao', 'lancamentos', 'patrimonio', 'sistema']

function ItemNav({ item }: { item: NavItem }) {
  const { to, label, icon: Icon } = item
  return (
    <NavLink
      to={to}
      end={to === '/'}
      aria-label={label}
      className={({ isActive }) =>
        [
          'group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all',
          isActive
            ? 'bg-brand-soft text-brand shadow-lg shadow-brand/20'
            : 'text-ink-muted hover:bg-surface-2 hover:text-ink hover:scale-105',
        ].join(' ')
      }
    >
      <Icon className="h-[19px] w-[19px]" strokeWidth={2.1} />
      <span
        className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 translate-x-[-4px] whitespace-nowrap rounded-lg bg-surface border border-line px-2.5 py-1.5 text-xs font-medium text-ink shadow-lg shadow-black/30 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 z-50"
      >
        {label}
      </span>
    </NavLink>
  )
}

export function Sidebar() {
  const { user, sair } = useAuth()
  const itensVisiveis = navItems.filter((item) => !item.masterOnly || user?.email === EMAIL_MASTER)
  const inicial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <aside className="hidden md:flex md:w-[76px] md:flex-col md:items-center md:border-r md:border-line md:bg-surface md:shrink-0 md:py-4">
      <img src={logo} alt="Financeiro" className="h-9 w-9 rounded-xl shadow-sm shadow-black/20 mb-5" />

      <nav className="flex-1 flex flex-col items-center w-full px-2.5">
        {ORDEM_GRUPOS.map((grupo, i) => {
          const itensDoGrupo = itensVisiveis.filter((item) => item.grupo === grupo)
          if (itensDoGrupo.length === 0) return null
          return (
            <div key={grupo} className="flex flex-col items-center gap-1 w-full">
              {i > 0 && <div className="h-px w-8 bg-line-soft my-2.5" />}
              {itensDoGrupo.map((item) => (
                <ItemNav key={item.to} item={item} />
              ))}
            </div>
          )
        })}
      </nav>

      <div className="flex flex-col items-center gap-2 pt-3 border-t border-line-soft w-full px-2.5">
        <span
          title={user?.email}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-bold text-brand ring-1 ring-inset ring-white/5"
        >
          {inicial}
        </span>
        <button
          onClick={sair}
          className="group relative flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted transition-all hover:bg-expense-soft hover:text-expense hover:scale-105"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2.1} />
          <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 translate-x-[-4px] whitespace-nowrap rounded-lg bg-surface border border-line px-2.5 py-1.5 text-xs font-medium text-ink shadow-lg shadow-black/30 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 z-50">
            Sair
          </span>
        </button>
      </div>
    </aside>
  )
}
