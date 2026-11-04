import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/shared/Logo'
import { IconeNav } from '@/components/layout/IconeNav'
import { navItems, EMAIL_MASTER, NOME_GRUPO, ORDEM_GRUPOS, type NavItem } from '@/lib/navigation'
import { useAuth } from '@/contexts/AuthContext'

// texto que só aparece com o menu aberto (hover ou foco por teclado)
const SO_ABERTO =
  'whitespace-nowrap opacity-0 -translate-x-1 transition-all duration-200 group-hover/side:opacity-100 group-hover/side:translate-x-0 group-focus-within/side:opacity-100 group-focus-within/side:translate-x-0'

function ItemNav({ item }: { item: NavItem }) {
  const { to, label } = item
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      className={({ isActive }) =>
        [
          'flex h-9 items-center gap-3 rounded-xl px-[10px] text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          isActive
            ? 'bg-brand-soft font-semibold text-brand ring-1 ring-inset ring-brand/20'
            : 'font-medium text-ink-muted hover:bg-surface-2 hover:text-ink',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <IconeNav item={item} ativo={isActive} />
          <span className={SO_ABERTO}>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const { user, sair } = useAuth()
  const itensVisiveis = navItems.filter((item) => !item.masterOnly || user?.email === EMAIL_MASTER)
  const itensDoSistema = itensVisiveis.filter((item) => item.grupo === 'sistema')
  const inicial = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    // a coluna reserva só 72px; o painel abre por cima do conteúdo, sem empurrar o layout
    <aside className="hidden md:block w-[72px] shrink-0 relative z-40">
      <div className="group/side absolute inset-y-0 left-0 flex w-[72px] flex-col overflow-hidden border-r border-line bg-surface px-3 py-4 transition-[width,box-shadow] duration-200 ease-out hover:w-60 hover:shadow-pop focus-within:w-60 focus-within:shadow-pop">
        <div className="mb-4 flex shrink-0 items-center gap-3 px-[6px]">
          <Logo tamanho={36} className="shrink-0" />
          <p className={`text-[15px] font-bold tracking-tight text-ink ${SO_ABERTO}`}>Financeiro</p>
        </div>

        {/* em tela baixa a lista rola sem mostrar barra, e o rodapé continua sempre visível */}
        <nav className="sem-barra -mx-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-3">
          {ORDEM_GRUPOS.filter((g) => g !== 'sistema').map((grupo, i) => {
            const itensDoGrupo = itensVisiveis.filter((item) => item.grupo === grupo)
            if (itensDoGrupo.length === 0) return null
            return (
              <div key={grupo} className="flex flex-col gap-0.5">
                <div className={`relative flex h-6 shrink-0 items-end px-[14px] pb-1 ${i === 0 ? 'hidden' : ''}`}>
                  <span className="absolute left-[14px] right-[14px] top-1/2 h-px bg-line-soft transition-opacity group-hover/side:opacity-0 group-focus-within/side:opacity-0" />
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint ${SO_ABERTO}`}
                  >
                    {NOME_GRUPO[grupo]}
                  </span>
                </div>
                {itensDoGrupo.map((item) => (
                  <ItemNav key={item.to} item={item} />
                ))}
              </div>
            )
          })}
        </nav>

        <div className="mt-2 flex shrink-0 flex-col gap-0.5 border-t border-line-soft pt-2">
          {itensDoSistema.map((item) => (
            <ItemNav key={item.to} item={item} />
          ))}
          <div className="mt-1 flex h-10 items-center gap-3 px-[8px]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#b66dff] text-[11px] font-bold text-white">
              {inicial}
            </span>
            <span className={`min-w-0 flex-1 truncate text-xs text-ink-muted ${SO_ABERTO}`}>
              {user?.email}
            </span>
            <button
              onClick={sair}
              title="Sair"
              aria-label="Sair"
              className={`shrink-0 rounded-lg p-1.5 text-ink-muted hover:bg-expense-soft hover:text-expense focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${SO_ABERTO}`}
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
