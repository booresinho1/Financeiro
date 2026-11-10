import type { ReactNode } from 'react'
import { ChevronDown, CreditCard, PenLine, TriangleAlert } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Parcelamento } from '@/lib/parcelamentos'
import { rotuloMes } from '@/components/dividas/coresParcelas'

/** Um parcelamento por linha: o fundo enche conforme as parcelas são pagas. */
export function LinhaParcelamento({
  item,
  cor,
  aberta,
  onAlternar,
  children,
}: {
  item: Parcelamento
  cor: string
  aberta: boolean
  onAlternar: () => void
  children?: ReactNode
}) {
  const progresso = item.totalParcelas > 0 ? (item.pagas / item.totalParcelas) * 100 : 0
  const segmentos = Math.min(item.totalParcelas, 24)
  const cartao = item.origem === 'cartao'

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-surface shadow-card"
      style={{ borderColor: `color-mix(in srgb, ${cor} 30%, var(--color-line))` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0"
        style={{ width: `${progresso}%`, background: `color-mix(in srgb, ${cor} 12%, transparent)`, transition: 'width 500ms ease-out' }}
      />
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberta}
        className="relative grid w-full grid-cols-[1fr_auto] items-center gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: cor }} />
            <span className="truncate text-[15px] font-bold text-ink">{item.nome}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
              {cartao ? <CreditCard className="h-3 w-3" /> : <PenLine className="h-3 w-3" />}
              {cartao ? `${item.rotuloOrigem} · automático` : 'Manual'}
            </span>
            {item.atrasadas > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-expense-soft px-2 py-0.5 text-[11px] font-bold text-expense">
                <TriangleAlert className="h-3 w-3" />
                {item.atrasadas} atrasada(s)
              </span>
            )}
            {item.repeteCartao && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400"
                title={`Mesma parcela de "${item.repeteCartao}" no cartão: se for a mesma compra, está contada duas vezes`}
              >
                <TriangleAlert className="h-3 w-3" />
                igual a {item.repeteCartao} no cartão?
              </span>
            )}
          </div>

          <div className="mt-2.5 flex gap-[3px]" aria-hidden>
            {Array.from({ length: segmentos }, (_, k) => {
              const pagasEscaladas = (item.pagas / item.totalParcelas) * segmentos
              return (
                <span
                  key={k}
                  className="h-1.5 flex-1 rounded-full"
                  style={{ background: k < Math.round(pagasEscaladas) ? cor : 'color-mix(in srgb, var(--color-ink) 9%, transparent)' }}
                />
              )
            })}
          </div>

          <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-ink-muted tabular-nums">
            <span>
              <b className="font-bold text-ink">
                {item.pagas} de {item.totalParcelas}
              </b>{' '}
              {cartao ? 'já cobradas' : 'pagas'}
            </span>
            <span>{formatCurrency(item.valorParcela)} por mês</span>
            {item.proxima && (
              <span>
                próxima {item.proxima.data ? formatDate(item.proxima.data).slice(0, 5) : ''} ·{' '}
                <b className="font-semibold text-ink-soft">{formatCurrency(item.proxima.valor)}</b>
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="text-[11px] font-medium text-ink-muted">faltam</p>
            <p className="text-xl font-extrabold tracking-tight text-ink tabular-nums">{formatCurrency(item.falta)}</p>
            {item.terminaEm && <p className="text-[11px] font-semibold text-ink-muted">até {rotuloMes(item.terminaEm)}</p>}
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${aberta ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {aberta && <div className="relative border-t border-line-soft bg-surface px-4 py-3">{children}</div>}
    </div>
  )
}
