import { CircleCheck, Flame, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { NivelSinal, SinalCategoria } from '@/lib/acao'

export const ESTILO_NIVEL: Record<NivelSinal, { rotulo: string; Icone: LucideIcon; texto: string; fundo: string; barra: string; borda: string }> = {
  critico: {
    rotulo: 'Agir',
    Icone: Flame,
    texto: 'text-expense',
    fundo: 'bg-expense-soft',
    barra: 'bg-expense',
    borda: 'var(--color-expense)',
  },
  atencao: {
    rotulo: 'Atenção',
    Icone: TriangleAlert,
    texto: 'text-amber-600 dark:text-amber-400',
    fundo: 'bg-amber-500/15',
    barra: 'bg-amber-500',
    borda: '#f59e0b',
  },
  ok: {
    rotulo: 'No plano',
    Icone: CircleCheck,
    texto: 'text-income',
    fundo: 'bg-income-soft',
    barra: 'bg-income',
    borda: 'var(--color-income)',
  },
}

/** "120%" do orçamento, ou "+38%" sobre a média. */
export function numeroDoSinal(s: SinalCategoria): string {
  if (s.tipoReferencia === 'orcamento') return `${Math.round(s.uso)}%`
  const d = Math.round(s.uso - 100)
  return `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}%`
}

export function legendaDoSinal(s: SinalCategoria): string {
  const prefixo = s.emAndamento ? 'até agora ' : ''
  if (s.tipoReferencia === 'orcamento') return `${prefixo}${Math.round(s.uso)}% do orçamento`
  return `${prefixo}${numeroDoSinal(s)} vs. sua média`
}
