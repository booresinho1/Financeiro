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
import type { Parcela } from '@/types/finance'
import { formatCurrency } from '@/lib/format'
import { somarMeses } from '@/lib/datas'
import { statusEfetivoParcela } from '@/lib/dividaResumo'
import { useChartColors } from '@/lib/chartTheme'

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

interface EvolucaoDividasChartProps {
  parcelas: Parcela[]
  mesInicial: string
  mesFinal: string
}

interface TooltipProps {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}

function TooltipConteudo({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-ink">{label}</p>
      <p className="text-ink-muted">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

function labelDoMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MESES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

export function EvolucaoDividasChart({ parcelas, mesInicial, mesFinal }: EvolucaoDividasChartProps) {
  const { grid: GRID, inkMuted: INK_MUTED, inkPrimary: INK_PRIMARY, cursorFill, brand: AZUL } = useChartColors()
  const dados = useMemo(() => {
    const pendentes = parcelas.filter((p) => {
      const status = statusEfetivoParcela(p)
      return status === 'PENDENTE' || status === 'ATRASADA'
    })

    const meses: string[] = []
    let atual = mesInicial
    let protecaoLoop = 0
    while (atual <= mesFinal && protecaoLoop < 120) {
      meses.push(atual)
      atual = somarMeses(`${atual}-01`, 1).slice(0, 7)
      protecaoLoop++
    }

    return meses.map((mes) => {
      const comprometido = pendentes
        .filter((p) => p.dataVencimento.slice(0, 7) === mes)
        .reduce((s, p) => s + p.valorPrevisto, 0)
      return { mes: labelDoMes(mes), Comprometido: comprometido }
    })
  }, [parcelas, mesInicial, mesFinal])

  const semDados = dados.every((d) => d.Comprometido === 0)

  if (semDados) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-ink-faint">
        Nenhuma parcela pendente nesse período.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
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
          width={76}
        />
        <Tooltip content={<TooltipConteudo />} cursor={{ fill: cursorFill }} />
        <Bar dataKey="Comprometido" fill={AZUL} radius={[4, 4, 0, 0]} maxBarSize={40}>
          <LabelList
            dataKey="Comprometido"
            position="top"
            formatter={(v) => (Number(v) > 0 ? formatCurrency(Number(v)) : '')}
            fill={INK_PRIMARY}
            fontSize={11}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
