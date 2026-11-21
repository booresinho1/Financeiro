import { classeDe, limitesDoMapa, quadranteDe, type Analise, type ClasseDesejo, type Desejo, type Quadrante } from '@/lib/desejos'
import { formatCurrency } from '@/lib/format'
import { FotoDesejo } from './FotoDesejo'

const QUADROS: { id: Quadrante; titulo: string; nota: string; cor: string }[] = [
  { id: 'fazerJa', titulo: 'Faça já', nota: 'importa muito, custa pouco', cor: 'var(--color-income)' },
  { id: 'planeje', titulo: 'Planeje', nota: 'importa muito, custa muito', cor: 'var(--color-brand)' },
  { id: 'seSobrar', titulo: 'Se sobrar', nota: 'importa pouco, custa pouco', cor: 'var(--color-ink-muted)' },
  { id: 'penseBem', titulo: 'Pense bem', nota: 'importa pouco, custa muito', cor: 'var(--color-warning)' },
]

/** O mapa em cartões, para tela estreita: as bolhas ficam pequenas demais no celular. */
export function QuadrantesDesejos({
  desejos,
  analises,
  classes,
  onAbrir,
}: {
  desejos: Desejo[]
  analises: Map<string, Analise>
  classes: ClasseDesejo[]
  onAbrir: (id: string) => void
}) {
  const limites = limitesDoMapa(desejos, analises)
  const grupos = new Map<Quadrante, Desejo[]>()
  for (const d of desejos) {
    const q = quadranteDe(analises.get(d.id)!, limites)
    grupos.set(q, [...(grupos.get(q) ?? []), d])
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {QUADROS.map((q) => {
        const itens = grupos.get(q.id) ?? []
        return (
          <div key={q.id} className="rounded-2xl p-3" style={{ background: `color-mix(in srgb, ${q.cor} 9%, transparent)` }}>
            <p className="flex items-baseline justify-between gap-1">
              <span className="text-sm font-extrabold" style={{ color: q.cor }}>
                {q.titulo}
              </span>
              <span className="text-xs font-bold tabular-nums text-ink-muted">{itens.length}</span>
            </p>
            <p className="text-[10.5px] leading-tight text-ink-faint">{q.nota}</p>
            <div className="mt-2 space-y-1">
              {itens.length === 0 && <p className="text-[11px] text-ink-faint">—</p>}
              {itens.map((d) => (
                <button key={d.id} type="button" onClick={() => onAbrir(d.id)} className="flex w-full items-center gap-1.5 rounded-lg bg-surface/70 p-1 text-left">
                  <FotoDesejo imagem={d.imagem} emoji={classeDe(d.classe, classes).emoji} tamanho={24} className="rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold leading-tight text-ink">{d.nome}</span>
                    <span className="block text-[10.5px] tabular-nums leading-tight text-ink-muted">
                      {formatCurrency(d.valor)}
                      {d.tipo === 'MENSAL' && '/mês'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
