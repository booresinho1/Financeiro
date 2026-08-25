import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Despesa } from '@/types/finance'
import { formatCurrency } from '@/lib/format'
import { useChartColors } from '@/lib/chartTheme'

const DIAS_ABREV = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
// Date.getDay() usa 0=domingo..6=sábado; convertemos pra começar na segunda.
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0]

const CATEGORIAS = ['LAZER', 'ALIMENTAÇÃO'] as const

interface GastoPorDiaSemanaChartProps {
  despesas: Despesa[]
}

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function TooltipConteudo({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm space-y-1">
      <p className="font-medium text-ink">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-1.5 text-ink-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.name}: {formatCurrency(item.value)}
        </p>
      ))}
    </div>
  )
}

export function GastoPorDiaSemanaChart({ despesas }: GastoPorDiaSemanaChartProps) {
  const { grid: GRID, inkMuted: INK_MUTED, cursorFill, custoFixo: COR_ALIMENTACAO, brand: COR_LAZER } =
    useChartColors()

  const dados = useMemo(() => {
    const relevantes = despesas.filter((d) => CATEGORIAS.includes(d.categoria as (typeof CATEGORIAS)[number]))
    if (relevantes.length === 0) return null

    const datas = despesas.map((d) => d.data).sort()
    const primeira = new Date(datas[0])
    const ultima = new Date(datas[datas.length - 1])

    const somaPorDataPorCategoria = new Map<string, Record<string, number>>()
    for (const d of relevantes) {
      const doDia = somaPorDataPorCategoria.get(d.data) ?? {}
      doDia[d.categoria] = (doDia[d.categoria] ?? 0) + d.valor
      somaPorDataPorCategoria.set(d.data, doDia)
    }

    const somaPorDiaSemana: Record<string, number[]> = {
      LAZER: Array(7).fill(0),
      ALIMENTAÇÃO: Array(7).fill(0),
    }
    const contagemPorDiaSemana = Array(7).fill(0)

    const cursor = new Date(primeira)
    while (cursor <= ultima) {
      const iso = cursor.toISOString().slice(0, 10)
      const wd = cursor.getDay()
      const doDia = somaPorDataPorCategoria.get(iso)
      for (const cat of CATEGORIAS) {
        somaPorDiaSemana[cat][wd] += doDia?.[cat] ?? 0
      }
      contagemPorDiaSemana[wd] += 1
      cursor.setDate(cursor.getDate() + 1)
    }

    return ORDEM_SEMANA.map((wd, i) => ({
      dia: DIAS_ABREV[i],
      Lazer: contagemPorDiaSemana[wd] ? somaPorDiaSemana.LAZER[wd] / contagemPorDiaSemana[wd] : 0,
      Alimentação: contagemPorDiaSemana[wd] ? somaPorDiaSemana.ALIMENTAÇÃO[wd] / contagemPorDiaSemana[wd] : 0,
    }))
  }, [despesas])

  if (!dados) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-ink-faint">
        Sem despesas de Lazer ou Alimentação registradas ainda.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="dia"
          tick={{ fill: INK_MUTED, fontSize: 11 }}
          axisLine={{ stroke: GRID }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: INK_MUTED, fontSize: 11 }}
          tickFormatter={(v) => formatCurrency(v)}
          axisLine={false}
          tickLine={false}
          width={72}
        />
        <Tooltip content={<TooltipConteudo />} cursor={{ fill: cursorFill }} />
        <Legend wrapperStyle={{ fontSize: 12, color: INK_MUTED }} iconType="circle" iconSize={8} />
        <Bar dataKey="Lazer" fill={COR_LAZER} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="Alimentação" fill={COR_ALIMENTACAO} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}
