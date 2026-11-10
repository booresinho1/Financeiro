import { Waypoints } from 'lucide-react'
import { FluxoFinanceiro } from '@/components/dre/FluxoFinanceiro'
import { nomeDoMes } from '@/lib/dre'
import type { DreMes } from '@/hooks/useDreMes'

/** Cartão "Fluxo do dinheiro": de onde veio, para onde foi, com os sinais de orçamento. */
export function FluxoDoMes({ mes, d }: { mes: string; d: DreMes }) {
  const { fluxo, sinais, abrirNo } = d
  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-card md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Waypoints className="h-5 w-5" strokeWidth={2.1} />
        </span>
        <div>
          <h2 className="text-base font-bold tracking-tight text-ink">Fluxo do dinheiro</h2>
          <p className="text-xs text-ink-muted">Passe o mouse num cartão ou num caminho para destacar</p>
        </div>
      </div>
      {fluxo.saidas.length || fluxo.entradas.length ? (
        <FluxoFinanceiro key={mes} fluxo={fluxo} sinais={sinais} onAbrir={abrirNo} />
      ) : (
        <p className="py-14 text-center text-sm text-ink-faint">Nada lançado em {nomeDoMes(mes)}.</p>
      )}
    </section>
  )
}
