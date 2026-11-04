import { useMemo, useState } from 'react'
import { TrendingUp, AlertTriangle } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useContas } from '@/hooks/useContas'
import { useDespesas } from '@/hooks/useDespesas'
import { useEntradas } from '@/hooks/useEntradas'
import { useMovimentacoes } from '@/hooks/useMovimentacoes'
import { useCustosFixos } from '@/hooks/useCustosFixos'
import { usePagamentosCustosFixos } from '@/hooks/usePagamentosCustosFixos'
import { useParcelas } from '@/hooks/useParcelas'
import { projetarFluxoCaixa } from '@/lib/fluxoCaixa'
import { hojeIso, somarMeses } from '@/lib/datas'
import { ComprometimentoMensalChart } from '@/components/dashboard/ComprometimentoMensalChart'
import { formatCurrency } from '@/lib/format'
import { useChartColors } from '@/lib/chartTheme'

const MESES_ABREV = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function rotuloMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MESES_ABREV[Number(m) - 1]}/${ano.slice(2)}`
}

function formatCompacto(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function FluxoCaixa() {
  const { contas, carregando: c1 } = useContas()
  const { despesas, carregando: c2 } = useDespesas()
  const { entradas, carregando: c3 } = useEntradas()
  const { movimentacoes, carregando: c4 } = useMovimentacoes()
  const { custosFixos, carregando: c5 } = useCustosFixos()
  const { pagamentos, carregando: c6 } = usePagamentosCustosFixos()
  const { parcelas, carregando: c7 } = useParcelas()
  const cores = useChartColors()
  const [mesInicial, setMesInicial] = useState(hojeIso().slice(0, 7))
  const [mesFinal, setMesFinal] = useState(somarMeses(`${hojeIso().slice(0, 7)}-01`, 5).slice(0, 7))

  const carregando = c1 || c2 || c3 || c4 || c5 || c6 || c7

  const linhas = useMemo(
    () =>
      projetarFluxoCaixa(
        { contas, despesas, entradas, movimentacoes, custosFixos, pagamentos, parcelas },
        hojeIso()
      ),
    [contas, despesas, entradas, movimentacoes, custosFixos, pagamentos, parcelas]
  )

  const primeiroNegativo = linhas.find((l) => l.saldo < 0)
  const pior = linhas.reduce((min, l) => (l.saldo < min.saldo ? l : min), linhas[0])
  const dadosGrafico = linhas.map((l) => ({ mes: rotuloMes(l.mes), Saldo: Math.round(l.saldo) }))

  if (carregando) {
    return <p className="text-sm text-ink-faint">Carregando...</p>
  }

  if (!contas.some((c) => c.ativa)) {
    return (
      <div>
        <PageHeader title="Fluxo de caixa" subtitle="Projeção do seu saldo mês a mês" />
        <EmptyState
          icon={TrendingUp}
          title="Nenhuma conta cadastrada"
          description="Cadastre ao menos uma conta para projetar o fluxo de caixa."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Fluxo de caixa"
        subtitle="Se tudo seguir como está, onde seu saldo vai parar nos próximos 12 meses"
      />

      {primeiroNegativo ? (
        <div className="flex items-start gap-3 rounded-2xl border border-expense/30 bg-expense-soft p-4 mb-6">
          <AlertTriangle className="h-5 w-5 text-expense shrink-0 mt-0.5" />
          <p className="text-sm text-ink">
            O saldo fica <strong>negativo em {rotuloMes(primeiroNegativo.mes)}</strong> (
            {formatCurrency(primeiroNegativo.saldo)}). Vale reduzir gastos ou antecipar entradas
            antes disso.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-surface p-4 mb-6 text-sm text-ink-muted">
          O saldo se mantém positivo nos próximos 12 meses. O ponto mais baixo é{' '}
          <strong className="text-ink">{formatCurrency(pior.saldo)}</strong> em {rotuloMes(pior.mes)}.
        </div>
      )}

      <section className="rounded-2xl border border-line bg-surface p-4 mb-6">
        <h3 className="text-sm font-semibold text-ink-soft mb-3">Saldo projetado</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosGrafico} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={cores.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: cores.inkMuted, fontSize: 12 }} tickLine={false} />
              <YAxis
                width={64}
                tick={{ fill: cores.inkMuted, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCompacto}
              />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v))}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <ReferenceLine y={0} stroke={cores.expense} strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="Saldo"
                stroke={cores.brand}
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <h3 className="text-sm font-semibold text-ink-soft">Evolução do comprometimento</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-xs text-ink-muted">De</label>
            <input
              type="month"
              value={mesInicial}
              max={mesFinal}
              onChange={(e) => e.target.value && setMesInicial(e.target.value)}
              className="min-w-0 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-soft"
            />
            <label className="text-xs text-ink-muted">até</label>
            <input
              type="month"
              value={mesFinal}
              min={mesInicial}
              onChange={(e) => e.target.value && setMesFinal(e.target.value)}
              className="min-w-0 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-soft"
            />
          </div>
        </div>
        <p className="text-xs text-ink-faint mb-2">
          Custos fixos e parcelas de dívidas somados, mês a mês
        </p>
        <ComprometimentoMensalChart
          custosFixos={custosFixos}
          pagamentosCustosFixos={pagamentos}
          parcelas={parcelas}
          mesInicial={mesInicial}
          mesFinal={mesFinal}
        />
      </section>

      <section className="rounded-2xl border border-line bg-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-faint border-b border-line">
              <th className="px-4 py-3 font-medium">Mês</th>
              <th className="px-4 py-3 font-medium text-right">Entradas</th>
              <th className="px-4 py-3 font-medium text-right">Parcelas</th>
              <th className="px-4 py-3 font-medium text-right">Custos fixos</th>
              <th className="px-4 py-3 font-medium text-right">Gasto variável</th>
              <th className="px-4 py-3 font-medium text-right">Resultado</th>
              <th className="px-4 py-3 font-medium text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.mes} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{rotuloMes(l.mes)}</td>
                <td className="px-4 py-3 text-right text-income">
                  {formatCurrency(l.entradas)}
                  {l.entradaEstimada && (
                    <span className="block text-[11px] text-ink-faint">estimada</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-ink-muted">{formatCurrency(l.parcelas)}</td>
                <td className="px-4 py-3 text-right text-ink-muted">
                  {formatCurrency(l.custosFixos)}
                </td>
                <td className="px-4 py-3 text-right text-ink-muted">
                  {formatCurrency(l.gastoVariavel)}
                </td>
                <td
                  className={`px-4 py-3 text-right ${l.resultado < 0 ? 'text-expense' : 'text-income'}`}
                >
                  {formatCurrency(l.resultado)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${l.saldo < 0 ? 'text-expense' : 'text-ink'}`}
                >
                  {formatCurrency(l.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-ink-faint mt-3">
        Entradas "estimadas" usam a média dos meses anteriores quando não há entrada prevista
        cadastrada. O gasto variável é a média dos últimos 3 meses, sem parcelas e custos fixos.
      </p>
    </div>
  )
}
