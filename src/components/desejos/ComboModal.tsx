import { useMemo, useState } from 'react'
import { ArrowRight, CircleAlert, CircleCheck, CircleX, Minus, Plus, TriangleAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { simularCombo, TETO_PARCELAS, classeDe, type Capacidade, type ClasseDesejo, type Desejo, type EscolhaCombo, type Ordem, type Veredito } from '@/lib/desejos'
import { rotuloMes } from '@/lib/dre'
import { formatCurrency } from '@/lib/format'

const nf = (v: number, d = 0) => v.toLocaleString('pt-BR', { maximumFractionDigits: d })

function quando(v: Veredito): string {
  if (v.tipo === 'agora') return 'agora'
  if (v.tipo === 'mensalOk') return 'no mês'
  if (v.tipo === 'mes') return rotuloMes(v.mes!)
  return 'não cabe'
}

export function ComboModal({
  ids,
  desejos,
  classes,
  cap,
  ordem,
  hoje,
  onClose,
}: {
  ids: string[]
  desejos: Desejo[]
  classes: ClasseDesejo[]
  cap: Capacidade
  ordem: Ordem
  hoje: string
  onClose: () => void
}) {
  const [escolhas, setEscolhas] = useState<EscolhaCombo[]>(() =>
    ids.flatMap((id) => {
      const d = desejos.find((x) => x.id === id)
      if (!d) return []
      const parcelavel = d.tipo === 'UNICO' && !!d.parcelas
      return [{ id, modo: d.tipo === 'MENSAL' ? 'mensal' : parcelavel ? 'parcelado' : 'avista', n: d.parcelas?.n ?? 10 } as EscolhaCombo]
    })
  )
  const [juros, setJuros] = useState('0')
  const jurosNum = Number(juros.replace(',', '.')) || 0

  const sim = useMemo(() => simularCombo(escolhas, desejos, classes, cap, ordem, hoje, jurosNum), [escolhas, desejos, classes, cap, ordem, hoje, jurosNum])
  const mudar = (id: string, parcial: Partial<EscolhaCombo>) => setEscolhas((e) => e.map((x) => (x.id === id ? { ...x, ...parcial } : x)))

  const Selo = sim.situacao === 'ok' ? CircleCheck : sim.situacao === 'aperta' ? CircleAlert : CircleX
  const cor = sim.situacao === 'ok' ? 'var(--color-income)' : sim.situacao === 'aperta' ? 'var(--color-warning)' : 'var(--color-expense)'
  const titulo = sim.situacao === 'ok' ? (escolhas.length === 1 ? 'Dá para fazer' : 'O conjunto cabe') : sim.situacao === 'aperta' ? 'Dá, mas aperta' : 'Não dá desse jeito'
  const maxBarra = Math.max(cap.sobraMensal, ...sim.linhaTempo.map((x) => x.sobra), 1)
  const minBarra = Math.min(0, ...sim.linhaTempo.map((x) => x.sobra))
  const alcance = maxBarra - minBarra || 1

  return (
    <Modal
      title={escolhas.length === 1 ? `E se eu fizer: ${desejos.find((x) => x.id === escolhas[0].id)?.nome ?? ''}?` : 'Simular juntos'}
      subtitle={escolhas.length === 1 ? 'Escolha como pagar e veja o efeito nas suas finanças e na fila' : `${escolhas.length} desejos: escolha como pagar cada um e veja o conjunto`}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-2">
        {sim.itens.map((it) => {
          const cls = classeDe(it.desejo.classe, classes)
          const e = escolhas.find((x) => x.id === it.desejo.id)!
          return (
            <div key={it.desejo.id} className="rounded-2xl border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-sm font-bold text-ink">
                  <span className="mr-1.5">{cls.emoji}</span>
                  {it.desejo.nome} <span className="font-normal text-ink-muted tabular-nums">· {formatCurrency(it.desejo.valor)}{it.desejo.tipo === 'MENSAL' && '/mês'}</span>
                </p>
                {it.desejo.tipo === 'UNICO' ? (
                  <div className="flex rounded-lg border border-line bg-surface-2/60 p-0.5 text-xs font-semibold">
                    {(['avista', 'parcelado'] as const).map((m) => (
                      <button key={m} type="button" onClick={() => mudar(it.desejo.id, { modo: m })} className={`rounded-md px-2.5 py-1 transition-colors ${e.modo === m ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'}`}>
                        {m === 'avista' ? 'À vista agora' : 'Parcelado'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-muted">todo mês</span>
                )}
              </div>

              {it.modo === 'parcelado' && (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <div className="flex items-center gap-1.5">
                    <button type="button" aria-label="Menos parcelas" onClick={() => mudar(it.desejo.id, { n: Math.max(it.n - 1, 2) })} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:bg-surface-2">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[64px] text-center text-sm font-extrabold tabular-nums text-ink">{it.n}× </span>
                    <button type="button" aria-label="Mais parcelas" onClick={() => mudar(it.desejo.id, { n: Math.min(it.n + 1, 48) })} className="flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:bg-surface-2">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-ink">{formatCurrency(it.parcela)}<span className="text-xs font-normal text-ink-muted">/mês</span></span>
                  {it.custoExtra > 0.5 && <span className="text-xs font-semibold text-expense tabular-nums">+{formatCurrency(it.custoExtra)} de juros</span>}
                  {it.foraDaRegra && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-warning">
                      <TriangleAlert className="h-3 w-3" /> {cls.nome} não parcela, pela sua regra
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
        <label className="flex items-center gap-2 pt-1 text-xs text-ink-muted">
          Juros ao mês, para parcelas diferentes da cadastrada
          <input inputMode="decimal" value={juros} onChange={(e) => setJuros(e.target.value)} className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-sm font-bold tabular-nums text-ink" />%
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: `color-mix(in srgb, ${cor} 40%, var(--color-line))`, background: `color-mix(in srgb, ${cor} 9%, transparent)` }}>
        <Selo className="h-6 w-6 shrink-0" style={{ color: cor }} />
        <div>
          <p className="text-base font-extrabold text-ink">{titulo}</p>
          <p className="text-sm text-ink-soft">{sim.motivo}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-ink">Quanto sobra em cada mês</p>
          <p className="text-[11px] text-ink-muted">hoje sobra {formatCurrency(cap.sobraMensal)}{sim.quitaEm && <> · tudo quitado em <b className="text-ink-soft">{rotuloMes(sim.quitaEm)}</b></>}</p>
        </div>
        <div className="mt-2 flex items-end gap-1" style={{ height: 96 }} role="img" aria-label="Sobra mensal nos próximos 24 meses">
          {sim.linhaTempo.map((m) => {
            const h = (Math.abs(m.sobra) / alcance) * 80
            const base = (-minBarra / alcance) * 80
            return (
              <div key={m.mes} className="group relative flex flex-1 flex-col justify-end" style={{ height: 96 }} title={`${rotuloMes(m.mes)}: ${formatCurrency(m.sobra)}`}>
                <div className="absolute inset-x-0 h-px bg-line" style={{ bottom: 8 + base }} />
                <div
                  className="absolute inset-x-0 rounded-[3px]"
                  style={{ height: Math.max(h, 2), bottom: m.sobra >= 0 ? 8 + base : 8 + base - h, background: m.sobra < 0 ? 'var(--color-expense)' : m.sobra < cap.sobraMensal ? 'var(--color-brand)' : 'var(--color-income)', opacity: 0.85 }}
                />
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex gap-1">
          {sim.linhaTempo.map((m, k) => (
            <span key={m.mes} className="flex-1 text-center text-[9px] text-ink-faint">{k % 3 === 0 ? rotuloMes(m.mes).slice(0, 3) : ''}</span>
          ))}
        </div>
      </div>

      <div className="mt-4 divide-y divide-line-soft rounded-2xl border border-line">
        <Linha rotulo="Sobra por mês (no começo)" antes={formatCurrency(sim.antes.sobra)} depois={formatCurrency(sim.depois.sobra)} pior={sim.depois.sobra < sim.antes.sobra} igual={sim.depois.sobra === sim.antes.sobra} />
        <Linha rotulo="Taxa de poupança" antes={sim.antes.poupancaPct === null ? '—' : `${nf(sim.antes.poupancaPct)}%`} depois={sim.depois.poupancaPct === null ? '—' : `${nf(sim.depois.poupancaPct)}%`} pior={(sim.depois.poupancaPct ?? 0) < (sim.antes.poupancaPct ?? 0)} igual={sim.depois.poupancaPct === sim.antes.poupancaPct} />
        <Linha rotulo="Separado para desejos" antes={formatCurrency(sim.antes.guardado)} depois={formatCurrency(sim.depois.guardado)} pior={sim.depois.guardado < sim.antes.guardado} igual={sim.depois.guardado === sim.antes.guardado} />
      </div>

      {sim.parcelaPctReceita !== null && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold text-ink-soft">Parcelas juntas na sua receita</span>
            <span className={`font-bold tabular-nums ${sim.passaDoTeto ? 'text-expense' : 'text-ink'}`}>{nf(sim.parcelaPctReceita, 1)}% <span className="font-normal text-ink-faint">· teto {TETO_PARCELAS * 100}%</span></span>
          </div>
          <div className="relative mt-1.5 h-2.5 rounded-full bg-ink/[0.07] dark:bg-white/[0.08]">
            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min((sim.parcelaPctReceita / (TETO_PARCELAS * 100 * 1.5)) * 100, 100)}%`, background: sim.passaDoTeto ? 'var(--color-expense)' : 'var(--color-brand)' }} />
            <div aria-hidden className="absolute -inset-y-0.5 w-0.5 bg-ink" style={{ left: `${(1 / 1.5) * 100}%` }} />
          </div>
        </div>
      )}
      {sim.custoExtra > 0.5 && (
        <p className="mt-3 rounded-xl bg-surface-2/60 px-3 py-2 text-xs text-ink-soft">
          Parcelar tudo isso custa <b className="text-expense">{formatCurrency(sim.custoExtra)}</b> a mais do que pagar à vista.
        </p>
      )}

      <div className="mt-5">
        <p className="text-sm font-bold text-ink">O que muda nos outros desejos</p>
        {sim.mudancas.length === 0 ? (
          <p className="mt-1.5 text-sm text-ink-muted">Nada muda para os desejos que ficaram de fora.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {sim.mudancas.map((m) => (
              <li key={m.desejo.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2/50 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-semibold text-ink">{m.desejo.nome}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs tabular-nums text-ink-muted">
                  {quando(m.de)}
                  <ArrowRight className="h-3 w-3" />
                  <b className={m.meses === null || m.meses > 0 ? 'text-expense' : 'text-income'}>{quando(m.para)}</b>
                  {m.meses !== null && m.meses !== 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ${m.meses > 0 ? 'bg-expense-soft text-expense' : 'bg-income-soft text-income'}`}>
                      {m.meses > 0 ? `atrasa ${m.meses}` : `adianta ${-m.meses}`} {Math.abs(m.meses) === 1 ? 'mês' : 'meses'}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function Linha({ rotulo, antes, depois, pior, igual }: { rotulo: string; antes: string; depois: string; pior: boolean; igual: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2.5 text-sm">
      <span className="text-ink-soft">{rotulo}</span>
      <span className="tabular-nums text-ink-muted">{antes}</span>
      <ArrowRight className="h-3.5 w-3.5 text-ink-faint" />
      <span className={`min-w-[84px] text-right font-extrabold tabular-nums ${igual ? 'text-ink' : pior ? 'text-expense' : 'text-income'}`}>{depois}</span>
    </div>
  )
}
