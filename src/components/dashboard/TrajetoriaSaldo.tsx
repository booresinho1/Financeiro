import { useId } from 'react'
import {
  Area,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PontoTrajetoria, Trajetoria } from '@/lib/ritmo'
import { formatCurrency } from '@/lib/format'

// mora dentro do painel escuro, que é escuro nos dois temas: cores fixas
const BRANCO = '#ffffff'
const LIMAO = '#c8f560'
const VERMELHO = '#ff8a8f'
const FUNDO = '#0e1016'

function TooltipConteudo({ active, payload }: { active?: boolean; payload?: { payload: PontoTrajetoria }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const valor = p.real ?? p.projetado
  if (valor === null) return null
  return (
    <div className="rounded-lg border border-white/10 bg-[#0e1016]/95 px-2.5 py-1.5 text-[11px] text-white shadow-lg backdrop-blur">
      <span className="text-white/55">Dia {p.dia} · </span>
      <span className="font-semibold">{formatCurrency(valor)}</span>
      {p.real === null && <span className="text-white/45"> previsto</span>}
    </div>
  )
}

/** Saldo do dia 1 até hoje (linha cheia) e, no ritmo atual, até o fim do mês (pontilhada). */
export function TrajetoriaSaldo({ trajetoria, diaHoje }: { trajetoria: Trajetoria; diaHoje: number }) {
  const brilhoId = `brilho-${useId().replace(/:/g, '')}`
  const { pontos, diaZerado } = trajetoria
  const totalDias = pontos.length
  const valores = pontos.flatMap((p) => [p.real, p.projetado]).filter((v): v is number => v !== null)
  const menor = Math.min(0, ...valores)
  const pontoHoje = pontos[diaHoje - 1]
  const pontoZerado = diaZerado ? pontos[diaZerado - 1] : null

  return (
    <div>
      <div className="h-[84px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={pontos} margin={{ top: 8, right: 6, bottom: 2, left: 6 }}>
            <defs>
              <linearGradient id={brilhoId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BRANCO} stopOpacity={0.18} />
                <stop offset="100%" stopColor={BRANCO} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="dia" type="number" domain={[1, totalDias]} hide />
            <YAxis domain={[Math.min(menor, 0), 'dataMax']} hide />
            <Tooltip
              content={<TooltipConteudo />}
              cursor={{ stroke: BRANCO, strokeOpacity: 0.2, strokeWidth: 1 }}
            />
            <ReferenceLine
              y={0}
              stroke={BRANCO}
              strokeOpacity={menor < 0 ? 0.35 : 0.1}
              strokeDasharray="2 3"
            />
            <Area
              type="monotone"
              dataKey="real"
              stroke={BRANCO}
              strokeOpacity={0.92}
              strokeWidth={2}
              fill={`url(#${brilhoId})`}
              dot={false}
              activeDot={{ r: 3.5, fill: BRANCO, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="projetado"
              stroke={LIMAO}
              strokeWidth={2}
              strokeDasharray="3 4"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 3.5, fill: LIMAO, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {pontoHoje?.real != null && (
              <>
                {/* halo do "hoje" */}
                <ReferenceDot x={diaHoje} y={pontoHoje.real} r={9} fill={BRANCO} fillOpacity={0.12} stroke="none" />
                <ReferenceDot
                  x={diaHoje}
                  y={pontoHoje.real}
                  r={4}
                  fill={BRANCO}
                  stroke={FUNDO}
                  strokeWidth={2}
                />
              </>
            )}
            {pontoZerado && pontoZerado.projetado !== null && (
              <>
                <ReferenceDot
                  x={pontoZerado.dia}
                  y={pontoZerado.projetado}
                  r={9}
                  fill={VERMELHO}
                  fillOpacity={0.18}
                  stroke="none"
                />
                <ReferenceDot
                  x={pontoZerado.dia}
                  y={pontoZerado.projetado}
                  r={4}
                  fill={VERMELHO}
                  stroke={FUNDO}
                  strokeWidth={2}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="relative mt-1 h-3 text-[10px] text-white/35">
        <span className="absolute left-0">dia 1</span>
        {diaHoje > 3 && diaHoje < totalDias - 3 && (
          <span
            className="absolute -translate-x-1/2 text-white/60"
            style={{ left: `${((diaHoje - 1) / (totalDias - 1)) * 100}%` }}
          >
            hoje
          </span>
        )}
        <span className="absolute right-0">dia {totalDias}</span>
      </div>
    </div>
  )
}
