import { ChevronRight, CircleCheck } from 'lucide-react'
import { emojiDaCategoria } from '@/lib/emojiCategoria'
import { formatCurrency } from '@/lib/format'
import { nomeLegivel } from '@/lib/nomeLegivel'
import type { SinalCategoria } from '@/lib/acao'
import { ESTILO_NIVEL, numeroDoSinal } from '@/components/dre/sinalEstilo'

function pct(v: number): string {
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

export function OndeAgir({
  itens,
  receitas,
  resultado,
  corDe,
  onAbrir,
}: {
  itens: SinalCategoria[]
  receitas: number
  resultado: number
  corDe: (categoria: string) => string
  onAbrir: (categoria: string) => void
}) {
  const recuperavel = itens.reduce((t, s) => t + s.excesso, 0)
  const emAndamento = itens.some((s) => s.emAndamento)

  if (!itens.length)
    return (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-income/30 bg-income-soft px-4 py-3.5">
        <CircleCheck className="h-5 w-5 shrink-0 text-income" />
        <p className="text-sm text-ink-soft">
          <b className="font-semibold text-ink">Nenhuma categoria fora do plano.</b> Todas estão dentro do orçamento ou
          perto da sua média.
        </p>
      </div>
    )

  const depois = resultado + recuperavel
  const n = itens.length
  const onde = n === 1 ? 'nesta categoria' : `nestas ${n} categorias`
  let consequencia = ''
  if (recuperavel > 0) {
    if (resultado < 0 && depois >= 0) consequencia = 'e o mês sai do vermelho'
    else if (resultado < 0) consequencia = `e o déficit cai para ${formatCurrency(-depois)}`
    else if (receitas > 0) consequencia = `e a poupança sobe para ${pct((depois / receitas) * 100)} da receita`
  }

  // todas as barras na mesma escala: dá para comparar o tamanho do estrago entre elas
  const escala = Math.max(...itens.map((s) => Math.max(s.gasto, s.referencia)), 1)

  return (
    <section className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
      <p className="text-xs font-semibold text-ink-muted">Onde agir{emAndamento ? ' · até agora' : ''}</p>
      {recuperavel > 0 ? (
        <p className="mt-1 text-xl font-extrabold leading-snug tracking-tight text-ink">
          Corte <span className="text-expense tabular-nums">{formatCurrency(recuperavel)}</span> {onde}
          {consequencia && <span className="text-income"> {consequencia}</span>}
        </p>
      ) : (
        <p className="mt-1 text-xl font-extrabold leading-snug tracking-tight text-ink">
          {n === 1 ? 'Uma categoria está' : `${n} categorias estão`} perto do limite
        </p>
      )}

      <div className="mt-4 divide-y divide-line-soft">
        {itens.map((s) => {
          const cor = corDe(s.nome)
          const posRef = (s.referencia / escala) * 100
          const posGasto = (s.gasto / escala) * 100
          const ref = s.tipoReferencia === 'orcamento' ? 'orçado' : 'média'
          return (
            <button
              key={s.nome}
              type="button"
              onClick={() => onAbrir(s.nome)}
              className="group grid w-full grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-4 py-3 text-left transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:grid-cols-[170px_1fr_150px]"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-lg leading-none">{emojiDaCategoria(s.nome)}</span>
                <span className="truncate text-sm font-semibold text-ink">{nomeLegivel(s.nome)}</span>
              </span>

              <span className="block">
                <span className="relative mb-1 block h-4 text-[11px] text-ink-muted tabular-nums">
                  <span
                    className="absolute whitespace-nowrap"
                    style={{ left: `${posRef}%`, transform: posRef > 80 ? 'translateX(-100%)' : posRef < 20 ? 'none' : 'translateX(-50%)' }}
                  >
                    {ref} <b className="font-semibold text-ink-soft">{formatCurrency(s.referencia)}</b>
                  </span>
                </span>
                <span className="relative block h-3.5 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.06]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${Math.min(posGasto, posRef)}%`, background: `color-mix(in srgb, ${cor} 55%, transparent)` }}
                  />
                  {posGasto > posRef && (
                    <span
                      className="absolute inset-y-0 rounded-r-full"
                      style={{ left: `${posRef}%`, width: `${posGasto - posRef}%`, background: 'var(--color-expense)' }}
                    />
                  )}
                  <span aria-hidden className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `calc(${posRef}% - 1px)` }} />
                </span>
                <span className="relative mt-1.5 block h-4 text-[11px] text-ink-muted tabular-nums">
                  <span className="absolute left-0">
                    gasto <b className="font-semibold text-ink-soft">{formatCurrency(s.gasto)}</b>
                    {receitas > 0 && <span> · {pct((s.gasto / receitas) * 100)} da receita</span>}
                  </span>
                </span>
              </span>

              <span className="flex items-center justify-end gap-2">
                <span className="text-right leading-tight">
                  {s.excesso > 0 ? (
                    <span className="block text-base font-extrabold text-expense tabular-nums">+{formatCurrency(s.excesso)}</span>
                  ) : (
                    <span className="block text-base font-extrabold text-ink tabular-nums">{Math.round(s.uso)}%</span>
                  )}
                  <span className={`block text-[11px] font-semibold ${ESTILO_NIVEL[s.nivel].texto}`}>
                    {numeroDoSinal(s)} {s.tipoReferencia === 'orcamento' ? 'do orçado' : 'vs. média'}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
