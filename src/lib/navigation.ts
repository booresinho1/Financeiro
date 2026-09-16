import {
  LayoutDashboard,
  Receipt,
  ArrowDownToLine,
  Wallet,
  Repeat,
  CreditCard,
  PiggyBank,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export type GrupoNav = 'visao' | 'lancamentos' | 'patrimonio' | 'sistema'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  masterOnly?: boolean
  grupo: GrupoNav
}

export const EMAIL_MASTER = 'booresinho1@gmail.com'

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, grupo: 'visao' },
  { to: '/despesas', label: 'Despesas', icon: Receipt, grupo: 'lancamentos' },
  { to: '/entradas', label: 'Entradas', icon: ArrowDownToLine, grupo: 'lancamentos' },
  { to: '/contas', label: 'Contas', icon: Wallet, grupo: 'patrimonio' },
  { to: '/custos-fixos', label: 'Custos Fixos', icon: Repeat, grupo: 'patrimonio' },
  { to: '/dividas', label: 'Dívidas', icon: CreditCard, grupo: 'patrimonio' },
  { to: '/orcamentos', label: 'Orçamentos', icon: PiggyBank, grupo: 'patrimonio' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, grupo: 'sistema' },
  { to: '/admin', label: 'Administração', icon: ShieldCheck, masterOnly: true, grupo: 'sistema' },
]

// Itens de destaque na navegação mobile (os demais ficam em "Mais").
// São só 3 porque o 4º espaço da barra é o botão flutuante de nova despesa.
export const mobilePrimaryNavItems: NavItem[] = [
  navItems[0],
  navItems[1],
  navItems[2],
]
