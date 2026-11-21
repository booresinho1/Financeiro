import {
  House,
  ReceiptText,
  BanknoteArrowDown,
  Wallet,
  CalendarSync,
  HandCoins,
  Target,
  Landmark,
  CreditCard,
  ChartNoAxesCombined,
  ChartPie,
  Settings,
  ShieldCheck,
  Scale,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export type GrupoNav = 'visao' | 'lancamentos' | 'planejamento' | 'contas' | 'sistema'

export type TomNav = 'violeta' | 'vermelho' | 'verde' | 'ambar' | 'azul' | 'neutro'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  tom: TomNav
  masterOnly?: boolean
  grupo: GrupoNav
}

export const EMAIL_MASTER = 'booresinho1@gmail.com'

export const ORDEM_GRUPOS: GrupoNav[] = ['visao', 'lancamentos', 'planejamento', 'contas', 'sistema']

export const NOME_GRUPO: Record<GrupoNav, string> = {
  visao: 'Visão',
  lancamentos: 'Lançamentos',
  planejamento: 'Planejamento',
  contas: 'Contas e banco',
  sistema: 'Sistema',
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: House, tom: 'violeta', grupo: 'visao' },
  { to: '/fluxo-de-caixa', label: 'Fluxo de caixa', icon: ChartNoAxesCombined, tom: 'violeta', masterOnly: true, grupo: 'visao' },
  { to: '/analise', label: 'Análise', icon: ChartPie, tom: 'violeta', grupo: 'visao' },
  { to: '/dre', label: 'Resultado (DRE)', icon: Scale, tom: 'violeta', grupo: 'visao' },
  { to: '/despesas', label: 'Despesas', icon: ReceiptText, tom: 'vermelho', grupo: 'lancamentos' },
  { to: '/entradas', label: 'Entradas', icon: BanknoteArrowDown, tom: 'verde', grupo: 'lancamentos' },
  { to: '/orcamentos', label: 'Orçamentos', icon: Target, tom: 'ambar', grupo: 'planejamento' },
  { to: '/custos-fixos', label: 'Custos Fixos', icon: CalendarSync, tom: 'ambar', grupo: 'planejamento' },
  { to: '/desejos', label: 'Desejos', icon: Sparkles, tom: 'ambar', grupo: 'planejamento' },
  { to: '/dividas', label: 'Dívidas', icon: HandCoins, tom: 'ambar', grupo: 'planejamento' },
  { to: '/contas', label: 'Contas', icon: Wallet, tom: 'azul', grupo: 'contas' },
  { to: '/cartao', label: 'Cartão', icon: CreditCard, tom: 'azul', masterOnly: true, grupo: 'contas' },
  { to: '/bancos', label: 'Bancos', icon: Landmark, tom: 'azul', masterOnly: true, grupo: 'contas' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, tom: 'neutro', grupo: 'sistema' },
  { to: '/admin', label: 'Administração', icon: ShieldCheck, tom: 'neutro', masterOnly: true, grupo: 'sistema' },
]

// Itens de destaque na navegação mobile (os demais ficam em "Mais").
// São só 3 porque o 4º espaço da barra é o botão flutuante de nova despesa.
export const mobilePrimaryNavItems: NavItem[] = ['/', '/despesas', '/entradas']
  .map((to) => navItems.find((item) => item.to === to))
  .filter((item): item is NavItem => !!item)
