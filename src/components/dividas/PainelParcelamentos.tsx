import { useState } from 'react'
import { CreditCard, PenLine } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { OrigemParcelamento, ResumoParcelamentos } from '@/lib/parcelamentos'
import { rotuloMes } from '@/components/dividas/coresParcelas'

function pct(v: number): string {
  return `${v >= 10 ? Math.round(v) : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

/** Resumo no topo: quanto falta, de onde vem (cartão × fora dele) e quando acaba. */
export function ResumoParcelas({
  resumo,
  cores,
  receitaMensal,
}: {
  resumo: ResumoParcelamentos
  cores: Record<string, string>
  receitaMensal: number
}) {
  const esteMes = resumo.meses[0]?.total ?? 0
  const pesoMes = receitaMensal > 0 ? (esteMes / receitaMensal) * 100 : null
  const grupos: { origem: OrigemParcelamento; titulo: string; falta: number; Icone: typeof CreditCard; nota: string }[] = [
    { origem: 'cartao' as const, titulo: 'No cartão', falta: resumo.faltaCartao, Icone: CreditCard, nota: 'compra(s) · automático' },
    { origem: 'manual' as const, titulo: 'Fora do cartão', falta: resumo.faltaManual, Icone: PenLine, nota: 'dívida(s) · manual' },
  ].filter((g) => g.falta > 0)
  const qtd = (o: 'cartao' | 'manual') => resumo.itens.filter((i) => i.origem === o).length

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold text-ink-muted">Falta pagar em parcelas</p>
          <p className="mt-1 text-[42px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
            {formatCurrency(resumo.falta)}
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-soft">
            {resumo.terminaEm ? (
              <>
                Livre de parcelas em <span className="text-income">{rotuloMes(resumo.terminaEm)}</span>
              </>
            ) : (
              'Nenhuma parcela em aberto'
            )}
          </p>
        </div>
        {resumo.meses.length > 0 && (
          <div className="rounded-2xl border border-line bg-surface-2/50 px-4 py-3 text-right">
            <p className="text-xs font-semibold text-ink-muted">Vence neste mês</p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-ink tabular-nums">{formatCurrency(esteMes)}</p>
            {pesoMes !== null && (
              <p className={`text-xs font-bold ${pesoMes > 30 ? 'text-expense' : pesoMes > 15 ? 'text-[#c98500]' : 'text-ink-muted'}`}>
                {pct(pesoMes)} da sua receita
              </p>
            )}
          </div>
        )}
      </div>

      {resumo.falta > 0 && (
        // a barra é feita dos próprios parcelamentos (mesmas cores do gráfico), agrupados por origem
        <div className="mt-5">
          <div className="flex gap-1.5">
            {grupos.map((g) => (
              <div key={g.origem} className="flex h-4 min-w-[24px] gap-[2px] overflow-hidden rounded-full" style={{ flexGrow: g.falta, flexBasis: 0 }}>
                {resumo.itens
                  .filter((i) => i.origem === g.origem)
                  .map((i) => (
                    <div key={i.id} title={`${i.nome}: ${formatCurrency(i.falta)}`} style={{ flexGrow: i.falta, flexBasis: 0, background: cores[i.id] }} />
                  ))}
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
            {grupos.map((g) => (
              <span key={g.origem} className="flex items-center gap-1.5">
                <g.Icone className="h-4 w-4 shrink-0 text-ink-muted" />
                <span className="font-semibold text-ink">{g.titulo}</span>
                <span className="text-ink-muted tabular-nums">
                  {formatCurrency(g.falta)} · {pct((g.falta / resumo.falta) * 100)} · {qtd(g.origem)} {g.nota}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/** Colunas por mês, empilhadas por parcelamento: dá para ver quando cada um sai da conta. */
export function LinhaDoTempoParcelas({
  resumo,
  cores,
  receitaMensal,
}: {
  resumo: ResumoParcelamentos
  cores: Record<string, string>
  receitaMensal: number
}) {
  const [foco, setFoco] = useState<string | null>(null)
  const max = Math.max(...resumo.meses.map((m) => m.total), 1)
  const ALTURA = 150
  if (!resumo.meses.length) return null
  const mesFoco = resumo.meses.find((m) => m.mes === foco)

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold tracking-tight text-ink">Quanto vence por mês</h3>
        <p className="text-xs text-ink-muted">Cada cor é um parcelamento · o número de baixo é o peso na sua receita</p>
      </div>

      <div className="mt-5 overflow-x-auto sem-barra" onMouseLeave={() => setFoco(null)}>
        <div className="flex min-w-max items-end gap-2" style={{ height: ALTURA + 64 }}>
          {resumo.meses.map((m, k) => {
            const h = (m.total / max) * ALTURA
            const peso = receitaMensal > 0 ? (m.total / receitaMensal) * 100 : null
            const ativo = foco === null || foco === m.mes
            return (
              <button
                key={m.mes}
                type="button"
                onMouseEnter={() => setFoco(m.mes)}
                onFocus={() => setFoco(m.mes)}
                className="flex w-[58px] flex-col items-center focus-visible:outline-none"
                style={{ opacity: ativo ? 1 : 0.45, transition: 'opacity 150ms' }}
              >
                <span className="mb-1 text-[11px] font-bold text-ink tabular-nums">
                  {m.total >= 1000 ? `${(m.total / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : Math.round(m.total)}
                </span>
                <span className="flex w-9 flex-col-reverse overflow-hidden rounded-md" style={{ height: Math.max(h, 3) }}>
                  {resumo.itens
                    .filter((i) => m.porItem[i.id])
                    .map((i) => (
                      <span
                        key={i.id}
                        style={{ height: `${(m.porItem[i.id] / m.total) * 100}%`, background: cores[i.id] }}
                        className="border-t border-surface first:border-t-0"
                      />
                    ))}
                </span>
                <span className={`mt-1.5 text-[11px] ${k === 0 ? 'font-bold text-ink' : 'text-ink-muted'}`}>{rotuloMes(m.mes)}</span>
                {peso !== null && (
                  <span
                    className={`text-[10.5px] font-bold ${peso > 30 ? 'text-expense' : peso > 15 ? 'text-[#c98500]' : 'text-ink-faint'}`}
                  >
                    {pct(peso)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-3 min-h-[44px] rounded-xl bg-surface-2/50 px-3 py-2">
        {mesFoco ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="font-bold text-ink">{rotuloMes(mesFoco.mes)}</span>
            {resumo.itens
              .filter((i) => mesFoco.porItem[i.id])
              .map((i) => (
                <span key={i.id} className="flex items-center gap-1.5 text-ink-soft tabular-nums">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cores[i.id] }} />
                  {i.nome} <b className="text-ink">{formatCurrency(mesFoco.porItem[i.id])}</b>
                </span>
              ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            {resumo.itens.map((i) => (
              <span key={i.id} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cores[i.id] }} />
                {i.nome}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
