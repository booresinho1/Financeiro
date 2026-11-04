import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MesFluxo } from '@/lib/fluxoCaixa'
import { formatCurrency } from '@/lib/format'
import { useChartColors } from '@/lib/chartTheme'

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

const compacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

function rotulo(mes: string) {
  return `${MESES_ABREV[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`
}

interface Ponto {
  rotulo: string
  saldo: number
  resultado: number
}

function TooltipConteudo({ active, payload }: { active?: boolean; payload?: { payload: Ponto }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs shadow-pop">
      <p className="font-semibold text-ink">{p.rotulo}</p>
      <p className="mt-1 text-ink-muted">
        Saldo <span className="font-semibold text-ink">{formatCurrency(p.saldo)}</span>
      </p>
      <p className="text-ink-muted">
        No mês{' '}
        <span className={`font-semibold ${p.resultado >= 0 ? 'text-income' : 'text-expense'}`}>
          {p.resultado >= 0 ? '+' : ''}
          {formatCurrency(p.resultado)}
        </span>
      </p>
    </div>
  )
}

export function ProjecaoSaldoChart({ linhas }: { linhas: MesFluxo[] }) {
  const cores = useChartColors()
  const gradienteId = useId().replace(/:/g, '')
  const dados: Ponto[] = linhas.map((l) => ({
    rotulo: rotulo(l.mes),
    saldo: Math.round(l.saldo),
    resultado: l.resultado,
  }))
  const temNegativo = dados.some((d) => d.saldo < 0)
  const ultimo = dados.length - 1

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={dados} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradienteId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cores.brand} stopOpacity={0.22} />
            <stop offset="100%" stopColor={cores.brand} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={cores.grid} vertical={false} />
        <XAxis
          dataKey="rotulo"
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
          cursor={{ stroke: cores.inkMuted, strokeWidth: 1, strokeOpacity: 0.4 }}
        />
        {temNegativo && <ReferenceLine y={0} stroke={cores.expense} strokeOpacity={0.6} />}
        <Area
          type="monotone"
          dataKey="saldo"
          stroke={cores.brand}
          strokeWidth={2}
          fill={`url(#${gradienteId})`}
          activeDot={{ r: 5, fill: cores.brand, stroke: cores.surface, strokeWidth: 2 }}
          dot={(props: { cx?: number; cy?: number; index?: number }) =>
            props.index === ultimo && props.cx !== undefined && props.cy !== undefined ? (
              <circle
                key="fim"
                cx={props.cx}
                cy={props.cy}
                r={4.5}
                fill={cores.brand}
                stroke={cores.surface}
                strokeWidth={2}
              />
            ) : (
              <g key={props.index} />
            )
          }
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
