import type { NavItem, TomNav } from '@/lib/navigation'

const CORES: Record<TomNav, string> = {
  violeta: 'bg-brand-soft text-brand',
  vermelho: 'bg-expense-soft text-expense',
  verde: 'bg-income-soft text-income',
  ambar: 'bg-warning-soft text-warning',
  azul: 'bg-info-soft text-info',
  neutro: 'bg-surface-2 text-ink-muted',
}

const TAMANHOS = {
  sm: { caixa: 'h-7 w-7 rounded-lg', icone: 'h-4 w-4' },
  md: { caixa: 'h-9 w-9 rounded-xl', icone: 'h-[18px] w-[18px]' },
}

/** Ícone do menu dentro de um quadrado com a cor do grupo; o item ativo ganha a cor cheia. */
export function IconeNav({
  item,
  ativo,
  tamanho = 'sm',
}: {
  item: NavItem
  ativo: boolean
  tamanho?: keyof typeof TAMANHOS
}) {
  const { icon: Icon, tom } = item
  const { caixa, icone } = TAMANHOS[tamanho]
  return (
    <span
      className={`flex shrink-0 items-center justify-center transition-colors ${caixa} ${
        ativo ? 'bg-brand text-white' : CORES[tom]
      }`}
    >
      <Icon className={icone} strokeWidth={2.1} />
    </span>
  )
}
