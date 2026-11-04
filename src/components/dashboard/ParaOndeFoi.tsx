import { useState } from 'react'
import { colorirSegmentos, type SegmentoComposicao } from '@/lib/ritmo'
import { formatCurrency, nomeBonito } from '@/lib/format'
import { useChartColors } from '@/lib/chartTheme'

interface Props {
  segmentos: SegmentoComposicao[]
  entradas: number
  onSelecionar: (segmento: SegmentoComposicao, cor: string) => void
}

/**
 * Uma barra do tamanho do que entrou, dividida no que saiu (fixos, parcelas, categorias),
 * no que ainda vai sair e na sobra. Se o gasto passou da renda, a barra estica e
 * um traço marca onde a renda acabou.
 */
export function ParaOndeFoi({ segmentos, entradas, onSelecionar }: Props) {
  const cores = useChartColors()
  const [foco, setFoco] = useState<string | null>(null)

  const total = Math.max(
    entradas,
    segmentos.reduce((s, x) => s + x.valor, 0)
  )
  const gastoTotal = segmentos
    .filter((s) => s.tipo !== 'sobrou')
    .reduce((s, x) => s + x.valor, 0)
  const passou = entradas > 0 && gastoTotal > entradas

  const comCor = colorirSegmentos(segmentos, cores)

  function estilo(s: (typeof comCor)[number]) {
    if (s.tipo === 'aPagar') {
      // ainda não saiu: listrado na cor de "a vencer"
      return {
        backgroundImage: `repeating-linear-gradient(135deg, ${s.cor} 0 4px, color-mix(in srgb, ${s.cor} 35%, transparent) 4px 8px)`,
      }
    }
    if (s.tipo === 'sobrou') {
      return { background: `color-mix(in srgb, ${s.cor} 28%, transparent)` }
    }
    return { background: s.cor }
  }

  if (!total) {
    return <p className="py-4 text-[13px] text-ink-faint">Nada entrou nem saiu neste mês.</p>
  }

  return (
    <div>
      <div className={`relative ${passou ? 'pt-5' : 'pt-1'}`}>
        {passou && (
          <span
            className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-expense"
            style={{ left: `${(entradas / total) * 100}%` }}
          >
            renda
          </span>
        )}
        {/* reflexo sutil por cima da barra inteira */}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3.5 rounded-full bg-gradient-to-b from-white/25 to-transparent to-60%" />
        <div className="flex h-3.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-2">
          {comCor.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Ver detalhes de ${nomeBonito(s.nome)}`}
              title={`${nomeBonito(s.nome)}: ${formatCurrency(s.valor)} · clique pra ver detalhes`}
              onClick={() => onSelecionar(s, s.cor)}
              onMouseEnter={() => setFoco(s.id)}
              onMouseLeave={() => setFoco(null)}
              className="h-full cursor-pointer transition-opacity duration-150 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(s.valor / total) * 100}%`,
                opacity: foco && foco !== s.id ? 0.3 : 1,
                ...estilo(s),
              }}
            />
          ))}
        </div>
        {passou && (
          <span
            className="pointer-events-none absolute top-4 bottom-[-4px] w-0.5 -translate-x-1/2 rounded-full bg-expense"
            style={{ left: `${(entradas / total) * 100}%` }}
          />
        )}
      </div>

      {passou && (
        <p className="mt-2 text-[12px] text-expense">
          Os gastos passaram {formatCurrency(gastoTotal - entradas)} do que entrou.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {comCor.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelecionar(s, s.cor)}
            onMouseEnter={() => setFoco(s.id)}
            onMouseLeave={() => setFoco(null)}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 text-left transition-colors ${foco === s.id ? 'bg-surface-2' : ''}`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={estilo(s)} />
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-soft">{nomeBonito(s.nome)}</span>
            <span className="text-[13px] font-semibold text-ink">{formatCurrency(s.valor)}</span>
            <span className="w-10 text-right text-[11px] text-ink-faint">
              {((s.valor / total) * 100).toFixed(0)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
