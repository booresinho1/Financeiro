import { useId } from 'react'
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import type { PontoRitmo, Ritmo } from '@/lib/ritmo'
import { formatCurrency } from '@/lib/format'
import { useChartColors } from '@/lib/chartTheme'

const compacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

// diferença menor que isso é "dentro do normal"
const TOLERANCIA = 0.05

function TooltipConteudo({ active, payload }: { active?: boolean; payload?: { payload: PontoRitmo }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="min-w-[180px] rounded-xl border border-line bg-surface px-3.5 py-3 text-xs shadow-pop">
      <p className="mb-2 font-semibold text-ink">Dia {p.dia}</p>
      {p.atual !== null && (
        <p className="flex justify-between gap-4 text-ink-muted">
          Este mês <span className="font-semibold text-ink">{formatCurrency(p.atual)}</span>
        </p>
      )}
      {p.normal !== null && (
        <p className="mt-1 flex justify-between gap-4 text-ink-muted">
          Seu normal <span className="font-semibold text-ink">{formatCurrency(p.normal)}</span>
        </p>
      )}
      {p.faixa && (
        <p className="mt-1 text-[11px] text-ink-faint">
          Entre {formatCurrency(p.faixa[0])} e {formatCurrency(p.faixa[1])} nos meses anteriores
        </p>
      )}
    </div>
  )
}

export function RitmoMesChart({ ritmo }: { ritmo: Ritmo }) {
  const cores = useChartColors()
  const gradienteId = `ritmo-${useId().replace(/:/g, '')}`
  const { pontos, diaReferencia, acumulado, normalNoDia, mesesComparados } = ritmo
  const totalDias = pontos.length

  const diferenca = normalNoDia !== null ? acumulado - normalNoDia : null
  const relativa = diferenca !== null && normalNoDia ? diferenca / normalNoDia : 0
  const acima = relativa > TOLERANCIA
  const abaixo = relativa < -TOLERANCIA

  const ticks = [1, 5, 10, 15, 20, 25, totalDias].filter((d, i, a) => d <= totalDias && a.indexOf(d) === i)

  return (
    <div>
      {/* a frase que responde "estou gastando demais?" */}
      <div className="mb-4 flex items-start gap-3">
        {diaReferencia > 0 && diferenca !== null && (
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              acima ? 'bg-warning-soft text-warning' : abaixo ? 'bg-income-soft text-income' : 'bg-surface-2 text-ink-muted'
            }`}
          >
            {acima ? <TrendingUp className="h-4 w-4" /> : abaixo ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </span>
        )}
        <div>
          {diaReferencia === 0 ? (
            <p className="text-[15px] font-semibold text-ink">Este mês ainda não começou</p>
          ) : diferenca === null ? (
            <p className="text-[15px] font-semibold text-ink">
              {formatCurrency(acumulado)} gastos até o dia {diaReferencia}
            </p>
          ) : acima ? (
            <p className="text-[15px] font-semibold text-ink">
              {formatCurrency(diferenca)} <span className="text-warning">acima</span> do seu ritmo normal
            </p>
          ) : abaixo ? (
            <p className="text-[15px] font-semibold text-ink">
              {formatCurrency(-diferenca)} <span className="text-income">abaixo</span> do seu ritmo normal
            </p>
          ) : (
            <p className="text-[15px] font-semibold text-ink">Dentro do seu ritmo normal</p>
          )}
          <p className="mt-0.5 text-[12px] text-ink-faint">
            {diaReferencia > 0 && `${formatCurrency(acumulado)} até o dia ${diaReferencia}`}
            {normalNoDia !== null && diaReferencia > 0 && ` · normal ${formatCurrency(normalNoDia)}`}
            {mesesComparados === 0 && ' · sem meses anteriores pra comparar'}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradienteId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cores.brand} stopOpacity={0.28} />
              <stop offset="100%" stopColor={cores.brand} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={cores.grid} vertical={false} />
          <XAxis
            dataKey="dia"
            type="number"
            domain={[1, totalDias]}
            ticks={ticks}
            tick={{ fill: cores.inkMuted, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fill: cores.inkMuted, fontSize: 11 }}
            tickFormatter={(v) => (v === 0 ? '0' : compacto.format(Number(v)))}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            content={<TooltipConteudo />}
            cursor={{ stroke: cores.inkMuted, strokeWidth: 1, strokeOpacity: 0.35 }}
          />
          {/* variação dos meses anteriores: faixa entre o menor e o maior */}
          <Area
            dataKey="faixa"
            stroke="none"
            fill={cores.inkMuted}
            fillOpacity={0.12}
            isAnimationActive={false}
            activeDot={false}
          />
          <Line
            dataKey="normal"
            stroke={cores.inkMuted}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            dataKey="atual"
            stroke={cores.brand}
            strokeWidth={2.5}
            fill={`url(#${gradienteId})`}
            connectNulls={false}
            activeDot={{ r: 5, fill: cores.brand, stroke: cores.surface, strokeWidth: 2 }}
            dot={(props: { cx?: number; cy?: number; payload?: PontoRitmo }) =>
              props.payload?.dia === diaReferencia && props.cx !== undefined && props.cy !== undefined ? (
                <circle
                  key="hoje"
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill={cores.brand}
                  stroke={cores.surface}
                  strokeWidth={2.5}
                />
              ) : (
                <g key={props.payload?.dia} />
              )
            }
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-full" style={{ background: cores.brand }} />
          Este mês
        </span>
        {mesesComparados > 0 && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-[1.5px] border-dashed" style={{ borderColor: cores.inkMuted }} />
              Seu normal · média de {mesesComparados} {mesesComparados === 1 ? 'mês' : 'meses'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-sm" style={{ background: cores.inkMuted, opacity: 0.2 }} />
              Variação
            </span>
          </>
        )}
      </div>
    </div>
  )
}
