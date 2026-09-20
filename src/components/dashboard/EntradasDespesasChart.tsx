import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Despesa, Entrada } from '@/types/finance'
import { formatCurrency } from '@/lib/format'
import { somarMeses } from '@/lib/datas'
import { useChartColors } from '@/lib/chartTheme'

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

// Largura mínima confortável (px) pra um grupo de 2 barras + rótulos não colidirem.
const LARGURA_POR_MES = 78
// Abaixo disso nem os rótulos diretos cabem — melhor confiar só no tooltip.
const LARGURA_MINIMA_PARA_ROTULO = 55

function formatCurrencyCompacto(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function useLarguraContainer<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setLargura(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, largura] as const
}

interface EntradasDespesasChartProps {
  entradas: Entrada[]
  despesas: Despesa[]
  periodo: string
  meses?: number
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

export function EntradasDespesasChart({
  entradas,
  despesas,
  periodo,
  meses = 6,
}: EntradasDespesasChartProps) {
  const {
    grid: GRID,
    inkMuted: INK_MUTED,
    inkPrimary: INK_SECUNDARIA,
    cursorFill,
    brand: COR_ENTRADAS,
    expense: COR_DESPESAS,
  } = useChartColors()
  const [containerRef, largura] = useLarguraContainer<HTMLDivElement>()

  const mesesQueCabem = largura > 0 ? Math.max(2, Math.floor(largura / LARGURA_POR_MES)) : meses
  const mesesExibidos = Math.min(meses, mesesQueCabem)
  const larguraPorGrupo = largura / Math.max(mesesExibidos, 1)
  const mostrarRotulos = larguraPorGrupo >= LARGURA_MINIMA_PARA_ROTULO

  const dados = useMemo(() => {
    const pontos = []
    for (let i = mesesExibidos - 1; i >= 0; i--) {
      const mesRef = somarMeses(`${periodo}-01`, -i).slice(0, 7)
      const ano = Number(mesRef.slice(0, 4))
      const mesNum = Number(mesRef.slice(5, 7))
      const totalEntradas = entradas
        .filter((e) => e.data.slice(0, 7) === mesRef)
        .reduce((s, e) => s + e.valor, 0)
      const totalDespesas = despesas
        .filter((d) => d.data.slice(0, 7) === mesRef)
        .reduce((s, d) => s + d.valor, 0)
      pontos.push({
        mes: `${MESES_ABREV[mesNum - 1]}/${String(ano).slice(2)}`,
        Entradas: totalEntradas,
        Despesas: totalDespesas,
      })
    }
    return pontos
  }, [entradas, despesas, periodo, mesesExibidos])

  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={224}>
        <BarChart data={dados} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="mes"
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
          <Legend
            wrapperStyle={{ fontSize: 12, color: INK_SECUNDARIA }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="Entradas" fill={COR_ENTRADAS} radius={[4, 4, 0, 0]} maxBarSize={18}>
            {mostrarRotulos && (
              <LabelList
                dataKey="Entradas"
                position="top"
                formatter={(v) => (Number(v) > 0 ? formatCurrencyCompacto(Number(v)) : '')}
                fill={INK_SECUNDARIA}
                fontSize={9}
                fontWeight={600}
              />
            )}
          </Bar>
          <Bar dataKey="Despesas" fill={COR_DESPESAS} radius={[4, 4, 0, 0]} maxBarSize={18}>
            {mostrarRotulos && (
              <LabelList
                dataKey="Despesas"
                position="top"
                formatter={(v) => (Number(v) > 0 ? formatCurrencyCompacto(Number(v)) : '')}
                fill={INK_SECUNDARIA}
                fontSize={9}
                fontWeight={600}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
