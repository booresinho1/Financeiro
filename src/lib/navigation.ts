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

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  masterOnly?: boolean
}

export const EMAIL_MASTER = 'booresinho1@gmail.com'

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/despesas', label: 'Despesas', icon: Receipt },
  { to: '/entradas', label: 'Entradas', icon: ArrowDownToLine },
  { to: '/contas', label: 'Contas', icon: Wallet },
  { to: '/custos-fixos', label: 'Custos Fixos', icon: Repeat },
  { to: '/dividas', label: 'Dívidas', icon: CreditCard },
  { to: '/orcamentos', label: 'Orçamentos', icon: PiggyBank },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/admin', label: 'Administração', icon: ShieldCheck, masterOnly: true },
]

// Itens de destaque na navegação mobile (os demais ficam em "Mais").
export const mobilePrimaryNavItems: NavItem[] = [
  navItems[0],
  navItems[1],
  navItems[2],
  navItems[3],
]
