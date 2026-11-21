import { classeDe, type ClasseDesejo, type Desejo, type Veredito } from '@/lib/desejos'
import { rotuloMes } from '@/lib/dre'
import { formatCurrency } from '@/lib/format'
import { FotoDesejo } from './FotoDesejo'

interface Parada {
  chave: string
  titulo: string
  nota: string
  tom: 'agora' | 'mes' | 'nao'
  itens: Desejo[]
}

function mesesEntre(de: string, ate: string): number {
  const [a1, m1] = de.split('-').map(Number)
  const [a2, m2] = ate.split('-').map(Number)
  return (a2 - a1) * 12 + (m2 - m1)
}

/** Cada desejo pousa no mês em que o dinheiro fica pronto. */
export function LinhaDoTempo({
  fila,
  veredito,
  classes,
  hoje,
  onAbrir,
}: {
  fila: Desejo[]
  veredito: Map<string, Veredito>
  classes: ClasseDesejo[]
  hoje: string
  onAbrir: (id: string) => void
}) {
  const mesAtual = hoje.slice(0, 7)
  const agora = fila.filter((d) => ['agora', 'mensalOk'].includes(veredito.get(d.id)!.tipo))
  const porMes = new Map<string, Desejo[]>()
  for (const d of fila) {
    const v = veredito.get(d.id)!
    if (v.tipo === 'mes' && v.mes) porMes.set(v.mes, [...(porMes.get(v.mes) ?? []), d])
  }
  const semData = fila.filter((d) => veredito.get(d.id)!.tipo === 'nao')

  const paradas: Parada[] = [
    ...(agora.length ? [{ chave: 'agora', titulo: 'Agora', nota: 'já cabe', tom: 'agora' as const, itens: agora }] : []),
    ...[...porMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, itens]) => {
        const n = mesesEntre(mesAtual, mes)
        return { chave: mes, titulo: rotuloMes(mes), nota: n === 1 ? 'mês que vem' : `daqui a ${n} meses`, tom: 'mes' as const, itens }
      }),
    ...(semData.length ? [{ chave: 'nao', titulo: 'Sem data', nota: 'não cabe sem cortar', tom: 'nao' as const, itens: semData }] : []),
  ]

  const cor = { agora: 'var(--color-income)', mes: 'var(--color-brand)', nao: 'var(--color-expense)' }

  return (
    // no computador corre na horizontal; no celular desce na vertical, sem coluna escondida para o lado
    <div className="sm:-mx-6 sm:overflow-x-auto sm:px-6 sm:pb-1">
      <ol className="relative flex flex-col gap-5 sm:min-w-max sm:flex-row sm:gap-3">
        {/* trilho que liga os meses */}
        <span aria-hidden className="absolute bottom-3 left-[9px] top-3 w-0.5 rounded-full bg-line sm:hidden" />
        <span aria-hidden className="absolute left-2 right-2 top-[9px] hidden h-0.5 rounded-full bg-line sm:block" />
        {paradas.map((p) => {
          const total = p.itens.reduce((s, d) => s + d.valor, 0)
          const destaque = p.tom === 'agora'
          return (
            <li key={p.chave} className="relative pl-8 sm:w-[210px] sm:shrink-0 sm:pl-0">
              <span
                aria-hidden
                className={`absolute left-0 top-0.5 z-10 block rounded-full border-4 border-surface sm:static ${destaque ? 'h-6 w-6 -translate-x-0.5 -translate-y-0.5 sm:translate-x-0' : 'h-5 w-5'}`}
                style={{ background: cor[p.tom] }}
              />
              <div className="flex items-baseline justify-between gap-2 sm:mt-2">
                <span className={`font-extrabold tracking-tight ${destaque ? 'text-xl' : 'text-base text-ink'}`} style={destaque ? { color: cor.agora } : undefined}>
                  {p.titulo}
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-ink-muted">{formatCurrency(total)}</span>
              </div>
              <p className="text-[11px]" style={{ color: p.tom === 'mes' ? 'var(--color-ink-faint)' : cor[p.tom] }}>
                {p.nota}
              </p>
              <div className="mt-2 space-y-1.5">
                {p.itens.map((d) => {
                  const v = veredito.get(d.id)!
                  const cls = classeDe(d.classe, classes)
                  // cofrinho: o fundo enche com o que já está reservado
                  const pct = d.tipo === 'UNICO' ? (d.valor > 0 ? Math.min((v.juntado / d.valor) * 100, 100) : 0) : v.tipo === 'mensalOk' ? 100 : 0
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => onAbrir(d.id)}
                      className="relative flex w-full items-center gap-2 overflow-hidden rounded-xl border border-line bg-surface p-1.5 pr-2.5 text-left transition-colors hover:bg-surface-2"
                      style={{ borderColor: destaque ? `color-mix(in srgb, ${cor.agora} 35%, var(--color-line))` : undefined }}
                    >
                      <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: `color-mix(in srgb, ${cor[p.tom]} 13%, transparent)` }} />
                      <FotoDesejo imagem={d.imagem} emoji={cls.emoji} tamanho={32} className="relative rounded-lg" />
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-ink">{d.nome}</span>
                        <span className="block text-[11px] tabular-nums text-ink-muted">
                          {formatCurrency(d.valor)}
                          {d.tipo === 'MENSAL' && '/mês'}
                          {v.atrasa && <span className="font-semibold text-warning"> · passa da data</span>}
                        </span>
                      </span>
                      {d.tipo === 'UNICO' && (
                        <span className="relative text-sm font-extrabold tabular-nums" style={{ color: pct > 0 ? cor[p.tom] : 'var(--color-ink-faint)' }}>
                          {Math.round(pct)}%
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
