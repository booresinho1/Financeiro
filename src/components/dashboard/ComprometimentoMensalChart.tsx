import { useMemo } from 'react'
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
import type { CustoFixo, Parcela } from '@/types/finance'
import { formatCurrency } from '@/lib/format'
import { somarMeses } from '@/lib/datas'
import { statusEfetivoParcela } from '@/lib/dividaResumo'
import { useChartColors } from '@/lib/chartTheme'

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

interface ComprometimentoMensalChartProps {
  custosFixos: CustoFixo[]
  parcelas: Parcela[]
  mesInicial: string
  mesFinal: string
}

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function TooltipConteudo({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, item) => s + item.value, 0)
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-sm space-y-1">
      <p className="font-medium text-ink">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-1.5 text-ink-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.name}: {formatCurrency(item.value)}
        </p>
      ))}
      <p className="pt-1 mt-1 border-t border-line-soft font-medium text-ink">
        Total: {formatCurrency(total)}
      </p>
    </div>
  )
}

function labelDoMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MESES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

function custoFixoAtivoNoMes(c: CustoFixo, mes: string): boolean {
  if (!c.ativo) return false
  if (c.dataInicio.slice(0, 7) > mes) return false
  if (c.dataFim && c.dataFim.slice(0, 7) < mes) return false
  return true
}

export function ComprometimentoMensalChart({
  custosFixos,
  parcelas,
  mesInicial,
  mesFinal,
}: ComprometimentoMensalChartProps) {
  const { grid: GRID, inkMuted: INK_MUTED, cursorFill, custoFixo: COR_CUSTO_FIXO, brand: COR_DIVIDA } =
    useChartColors()

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
      const custoFixoTotal = custosFixos
        .filter((c) => custoFixoAtivoNoMes(c, mes))
        .reduce((s, c) => s + c.valorPrevisto, 0)
      const dividaTotal = pendentes
        .filter((p) => p.dataVencimento.slice(0, 7) === mes)
        .reduce((s, p) => s + p.valorPrevisto, 0)
      return { mes: labelDoMes(mes), 'Custos fixos': custoFixoTotal, 'Dívidas': dividaTotal }
    })
  }, [custosFixos, parcelas, mesInicial, mesFinal])

  const semDados = dados.every((d) => d['Custos fixos'] === 0 && d['Dívidas'] === 0)

  if (semDados) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-ink-faint">
        Nenhum compromisso nesse período.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
        <Legend wrapperStyle={{ fontSize: 12, color: INK_MUTED }} iconType="circle" iconSize={8} />
        <Bar dataKey="Custos fixos" stackId="comprometido" fill={COR_CUSTO_FIXO} radius={[0, 0, 0, 0]} maxBarSize={40}>
          <LabelList
            dataKey="Custos fixos"
            position="center"
            formatter={(v) => (Number(v) > 0 ? formatCurrency(Number(v)) : '')}
            fill="#ffffff"
            fontSize={10.5}
            fontWeight={600}
          />
        </Bar>
        <Bar dataKey="Dívidas" stackId="comprometido" fill={COR_DIVIDA} radius={[4, 4, 0, 0]} maxBarSize={40}>
          <LabelList
            dataKey="Dívidas"
            position="center"
            formatter={(v) => (Number(v) > 0 ? formatCurrency(Number(v)) : '')}
            fill="#ffffff"
            fontSize={10.5}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
