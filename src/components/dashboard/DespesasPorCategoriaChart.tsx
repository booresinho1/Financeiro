import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Despesa } from '@/types/finance'
import { formatCurrency } from '@/lib/format'
import { useChartColors } from '@/lib/chartTheme'

interface DespesasPorCategoriaChartProps {
  despesas: Despesa[]
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: { categoria: string; valor: number } }[]
}

function TooltipConteudo({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const { categoria, valor } = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-ink">{categoria}</p>
      <p className="text-ink-muted">{formatCurrency(valor)}</p>
    </div>
  )
}

export function DespesasPorCategoriaChart({ despesas }: DespesasPorCategoriaChartProps) {
  const { grid: GRID, inkMuted: INK_MUTED, inkPrimary: INK_PRIMARY, expense: COR_DESPESA, cursorFill } = useChartColors()
  const dados = useMemo(() => {
    const porCategoria = new Map<string, number>()
    for (const d of despesas) {
      porCategoria.set(d.categoria, (porCategoria.get(d.categoria) ?? 0) + d.valor)
    }
    return Array.from(porCategoria, ([categoria, valor]) => ({ categoria, valor })).sort(
      (a, b) => b.valor - a.valor
    )
  }, [despesas])

  if (dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-ink-faint">
        Sem despesas neste período.
      </div>
    )
  }

  const altura = Math.max(dados.length * 32, 120)

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: INK_MUTED, fontSize: 11 }}
          tickFormatter={(v) => formatCurrency(v)}
          axisLine={{ stroke: GRID }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="categoria"
          width={140}
          tick={{ fill: INK_PRIMARY, fontSize: 12 }}
          axisLine={{ stroke: GRID }}
          tickLine={false}
        />
        <Tooltip content={<TooltipConteudo />} cursor={{ fill: cursorFill }} />
        <Bar dataKey="valor" fill={COR_DESPESA} radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList
            dataKey="valor"
            position="right"
            formatter={(v) => formatCurrency(Number(v))}
            fill={INK_PRIMARY}
            fontSize={11}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
