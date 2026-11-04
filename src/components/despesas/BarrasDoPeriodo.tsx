import { formatCurrency } from '@/lib/format'
import type { BarraDoPeriodo } from '@/lib/despesasPainel'

// mora dentro do painel escuro, que é escuro nos dois temas: cores fixas
const COR_BARRA = '#8b80ff'
const COR_SELECIONADA = '#c8f560'
const ALTURA_MINIMA = 3
const INTERVALO_ROTULOS = 5

/** Uma barra por dia (ou por mês); clicar filtra a lista. */
export function BarrasDoPeriodo({
  barras,
  selecionada,
  hoje,
  media,
  onSelecionar,
}: {
  barras: BarraDoPeriodo[]
  selecionada: string | null
  hoje: string
  media: number | null
  onSelecionar: (chave: string) => void
}) {
  const maior = Math.max(...barras.map((b) => b.valor), media ?? 0, 1)
  const porMes = barras.length > 0 && barras[0].chave.length === 7

  return (
    <div>
      <div className="relative flex h-32 items-end gap-[2px]">
        {media !== null && media > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/30"
            style={{ bottom: `${(media / maior) * 100}%` }}
          >
            <span className="absolute -top-4 right-0 text-[10px] text-white/50">
              média {formatCurrency(media)}
            </span>
          </div>
        )}
        {barras.map((b, i) => {
          const ativa = selecionada === b.chave
          const naEsquerda = i < barras.length / 3
          const naDireita = i > (barras.length * 2) / 3
          return (
            <button
              key={b.chave}
              type="button"
              disabled={b.valor === 0}
              onClick={() => onSelecionar(b.chave)}
              aria-label={`${b.rotulo}: ${formatCurrency(b.valor)}`}
              aria-pressed={ativa}
              className="group relative flex h-full min-w-0 flex-1 items-end rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 enabled:cursor-pointer"
            >
              <span
                className="block w-full rounded-t-[4px] transition-opacity group-hover:opacity-100"
                style={{
                  height: b.valor > 0 ? `max(${(b.valor / maior) * 100}%, ${ALTURA_MINIMA}px)` : '2px',
                  background: b.valor === 0 ? 'rgb(255 255 255 / 0.1)' : ativa ? COR_SELECIONADA : COR_BARRA,
                  opacity: b.valor === 0 ? 1 : selecionada && !ativa ? 0.35 : 0.9,
                }}
              />
              {b.valor > 0 && (
                <span
                  className={`pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-lg border border-white/10 bg-[#0e1016]/95 px-2.5 py-1.5 text-left text-[11px] text-white shadow-lg group-hover:block group-focus-visible:block ${
                    naEsquerda ? 'left-0' : naDireita ? 'right-0' : 'left-1/2 -translate-x-1/2'
                  }`}
                >
                  <span className="text-white/55">{b.rotulo} · </span>
                  <b className="font-semibold">{formatCurrency(b.valor)}</b>
                  <span className="text-white/55"> · {b.qtd} lanç.</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[10px] text-white/45">
        {barras.map((b, i) => {
          const mostrar = porMes || i === 0 || (i + 1) % INTERVALO_ROTULOS === 0
          return (
            <span
              key={b.chave}
              className={`min-w-0 flex-1 overflow-visible whitespace-nowrap text-center ${b.chave === hoje ? 'font-semibold text-white' : ''}`}
            >
              {mostrar ? (porMes ? b.rotulo : b.rotulo.slice(0, 2)) : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}
