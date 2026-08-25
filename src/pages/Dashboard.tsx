import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  Receipt,
  Scale,
  Repeat,
  CreditCard,
  Target,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EntradasDespesasChart } from '@/components/dashboard/EntradasDespesasChart'
import { DespesasPorCategoriaChart } from '@/components/dashboard/DespesasPorCategoriaChart'
import { ComprometimentoMensalChart } from '@/components/dashboard/ComprometimentoMensalChart'
import { useDespesas } from '@/hooks/useDespesas'
import { useEntradas } from '@/hooks/useEntradas'
import { useContas } from '@/hooks/useContas'
import { useMovimentacoes } from '@/hooks/useMovimentacoes'
import { useCustosFixos } from '@/hooks/useCustosFixos'
import { usePagamentosCustosFixos } from '@/hooks/usePagamentosCustosFixos'
import { useParcelas } from '@/hooks/useParcelas'
import { useMetas } from '@/hooks/useMetas'
import { calcularSaldo, calcularTotalEmContas } from '@/lib/saldos'
import { formatCurrency, formatDate } from '@/lib/format'
import { somarMeses } from '@/lib/datas'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function periodoAtual(): string {
  return new Date().toISOString().slice(0, 7)
}

function labelPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-')
  return `${MESES[Number(mes) - 1]}/${ano}`
}

interface CardIndicadorProps {
  titulo: string
  valor: string
  icone: typeof Wallet
  cor: string
  corFundo: string
  nota?: string
}

function CardIndicador({ titulo, valor, icone: Icone, cor, corFundo, nota }: CardIndicadorProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm shadow-slate-900/[0.02] flex items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${corFundo}`}>
        <Icone className={`h-[18px] w-[18px] ${cor}`} strokeWidth={2.1} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-muted">{titulo}</p>
        <p className="text-2xl font-bold text-ink mt-0.5 tracking-tight truncate">{valor}</p>
        {nota && <p className="text-[11px] text-ink-faint mt-0.5 truncate">{nota}</p>}
      </div>
    </div>
  )
}

function CardBase({
  eyebrow,
  children,
  className = '',
}: {
  eyebrow: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface p-5 shadow-sm shadow-slate-900/[0.02] ${className}`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {eyebrow}
      </span>
      {children}
    </div>
  )
}

export function Dashboard() {
  const { despesas } = useDespesas()
  const { entradas } = useEntradas()
  const { contas } = useContas()
  const { movimentacoes } = useMovimentacoes()
  const { custosFixos } = useCustosFixos()
  const { pagamentos: pagamentosCustosFixos } = usePagamentosCustosFixos()
  const { parcelas } = useParcelas()
  const { metas } = useMetas()

  const [periodo, setPeriodo] = useState(periodoAtual())
  const [mesInicialComprometido, setMesInicialComprometido] = useState(periodoAtual())
  const [mesFinalComprometido, setMesFinalComprometido] = useState(
    somarMeses(`${periodoAtual()}-01`, 2).slice(0, 7)
  )
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null)
  const [ordenarTabelaPor, setOrdenarTabelaPor] = useState<'data' | 'valor'>('data')
  const [ordemTabelaAsc, setOrdemTabelaAsc] = useState(false)

  useEffect(() => {
    setCategoriaSelecionada(null)
  }, [periodo])

  const dadosSaldo = { despesas, entradas, movimentacoes }

  const contaAutomatica = contas.find((c) => c.tipo === 'AUTOMATICA' && c.ativa)
  const dinheiroDisponivel = contaAutomatica ? calcularSaldo(contaAutomatica, dadosSaldo) : 0
  const totalEmContas = useMemo(
    () => calcularTotalEmContas(contas, dadosSaldo),
    [contas, despesas, entradas, movimentacoes]
  )

  const entradasDoPeriodo = useMemo(
    () =>
      entradas
        .filter((e) => e.data.slice(0, 7) === periodo && e.status === 'RECEBIDA')
        .reduce((s, e) => s + e.valor, 0),
    [entradas, periodo]
  )
  const entradasPrevistasDoPeriodo = useMemo(
    () =>
      entradas
        .filter((e) => e.data.slice(0, 7) === periodo && e.status === 'PREVISTA')
        .reduce((s, e) => s + e.valor, 0),
    [entradas, periodo]
  )
  const despesasFiltradas = useMemo(
    () => despesas.filter((d) => d.data.slice(0, 7) === periodo),
    [despesas, periodo]
  )
  const despesasDaTabela = useMemo(() => {
    const filtradas = despesasFiltradas.filter(
      (d) => !categoriaSelecionada || d.categoria === categoriaSelecionada
    )
    return [...filtradas].sort((a, b) => {
      let comparacao = 0
      if (ordenarTabelaPor === 'valor') comparacao = a.valor - b.valor
      else comparacao = a.data.localeCompare(b.data)
      return ordemTabelaAsc ? comparacao : -comparacao
    })
  }, [despesasFiltradas, categoriaSelecionada, ordenarTabelaPor, ordemTabelaAsc])

  function alternarOrdenacaoTabela(campo: 'data' | 'valor') {
    if (ordenarTabelaPor === campo) {
      setOrdemTabelaAsc((atual) => !atual)
    } else {
      setOrdenarTabelaPor(campo)
      setOrdemTabelaAsc(false)
    }
  }
  const despesasDoPeriodo = useMemo(
    () => despesasFiltradas.reduce((s, d) => s + d.valor, 0),
    [despesasFiltradas]
  )
  const resultado = entradasDoPeriodo - despesasDoPeriodo

  const custosFixosDoPeriodo = useMemo(
    () =>
      custosFixos
        .filter(
          (c) =>
            c.ativo &&
            c.dataInicio.slice(0, 7) <= periodo &&
            !pagamentosCustosFixos.some((p) => p.idCustoFixo === c.id && p.periodo === periodo)
        )
        .reduce((s, c) => s + c.valorPrevisto, 0),
    [custosFixos, pagamentosCustosFixos, periodo]
  )
  const parcelasDoPeriodo = useMemo(
    () =>
      parcelas
        .filter(
          (p) =>
            p.dataVencimento.slice(0, 7) === periodo &&
            (p.status === 'PENDENTE' || p.status === 'ATRASADA')
        )
        .reduce((s, p) => s + p.valorPrevisto, 0),
    [parcelas, periodo]
  )
  const totalComprometido = custosFixosDoPeriodo + parcelasDoPeriodo

  const reservas = useMemo(
    () =>
      contas
        .filter((c) => c.tipo === 'MANUAL' && c.ativa)
        .map((c) => ({ conta: c, meta: metas.find((m) => m.idConta === c.id) }))
        .filter((r) => r.meta),
    [contas, metas]
  )

  const mesAnterior = somarMeses(`${periodo}-01`, -1).slice(0, 7)
  const proximoMes = somarMeses(`${periodo}-01`, 1).slice(0, 7)

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Visão consolidada da sua vida financeira" />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center rounded-xl border border-line bg-surface p-1 shadow-sm shadow-slate-900/[0.02]">
          <button
            onClick={() => setPeriodo(mesAnterior)}
            aria-label="Mês anterior"
            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink-soft"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm font-semibold text-ink min-w-[110px] text-center">
            {labelPeriodo(periodo)}
          </span>
          <button
            onClick={() => setPeriodo(proximoMes)}
            aria-label="Próximo mês"
            className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink-soft"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <input
          type="month"
          value={periodo}
          onChange={(e) => e.target.value && setPeriodo(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-muted shadow-sm shadow-slate-900/[0.02]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CardIndicador
          titulo="Dinheiro disponível"
          valor={formatCurrency(dinheiroDisponivel)}
          icone={Wallet}
          cor="text-income"
          corFundo="bg-income-soft"
          nota={
            !contaAutomatica
              ? 'Crie uma conta do tipo Automática em Contas pra este número funcionar'
              : undefined
          }
        />
        <CardIndicador
          titulo="Total em contas"
          valor={formatCurrency(totalEmContas)}
          icone={Scale}
          cor="text-ink-muted"
          corFundo="bg-surface-2"
        />
        <CardIndicador
          titulo="Entradas do período"
          valor={formatCurrency(entradasDoPeriodo)}
          icone={ArrowDownToLine}
          cor="text-income"
          corFundo="bg-income-soft"
          nota={
            entradasPrevistasDoPeriodo > 0
              ? `+ ${formatCurrency(entradasPrevistasDoPeriodo)} previstas`
              : undefined
          }
        />
        <CardIndicador
          titulo="Despesas do período"
          valor={formatCurrency(despesasDoPeriodo)}
          icone={Receipt}
          cor="text-expense"
          corFundo="bg-expense-soft"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <CardBase eyebrow="Resultado do período">
          <div className="flex items-center gap-2 mt-2">
            {resultado >= 0 ? (
              <TrendingUp className="h-4 w-4 text-income" />
            ) : (
              <TrendingDown className="h-4 w-4 text-expense" />
            )}
            <p
              className={`text-2xl font-bold tracking-tight ${
                resultado >= 0 ? 'text-income' : 'text-expense'
              }`}
            >
              {resultado >= 0 ? '+' : ''}
              {formatCurrency(resultado)}
            </p>
          </div>
        </CardBase>

        <CardBase eyebrow="Compromissos futuros" className="sm:col-span-2">
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div>
              <div className="flex items-center gap-1.5 text-ink-faint">
                <Repeat className="h-3.5 w-3.5" />
                <span className="text-xs">Custos fixos</span>
              </div>
              <p className="text-lg font-bold text-ink mt-0.5">
                {formatCurrency(custosFixosDoPeriodo)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-ink-faint">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="text-xs">Parcelas</span>
              </div>
              <p className="text-lg font-bold text-ink mt-0.5">
                {formatCurrency(parcelasDoPeriodo)}
              </p>
            </div>
            <div>
              <span className="text-xs text-ink-faint">Total comprometido</span>
              <p className="text-lg font-bold text-ink mt-0.5">
                {formatCurrency(totalComprometido)}
              </p>
            </div>
          </div>
        </CardBase>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm shadow-slate-900/[0.02] mt-3">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Evolução do comprometimento mensal
          </span>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="text-xs text-ink-muted">De</label>
            <input
              type="month"
              value={mesInicialComprometido}
              max={mesFinalComprometido}
              onChange={(e) => e.target.value && setMesInicialComprometido(e.target.value)}
              className="min-w-0 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-soft"
            />
            <label className="text-xs text-ink-muted">até</label>
            <input
              type="month"
              value={mesFinalComprometido}
              min={mesInicialComprometido}
              onChange={(e) => e.target.value && setMesFinalComprometido(e.target.value)}
              className="min-w-0 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-soft"
            />
          </div>
        </div>
        <p className="text-xs text-ink-faint mb-2">
          Custos fixos e parcelas de dívidas somados, mês a mês
        </p>
        <ComprometimentoMensalChart
          custosFixos={custosFixos}
          pagamentosCustosFixos={pagamentosCustosFixos}
          parcelas={parcelas}
          mesInicial={mesInicialComprometido}
          mesFinal={mesFinalComprometido}
        />
      </div>

      <div className="mt-3">
        <CardBase eyebrow="Entradas vs. despesas">
          <EntradasDespesasChart entradas={entradas} despesas={despesas} periodo={periodo} />
        </CardBase>
      </div>

      <div className="mt-3">
        <CardBase eyebrow={`Despesas por categoria — ${labelPeriodo(periodo)}`}>
          <div className="mt-2">
            <DespesasPorCategoriaChart
              despesas={despesasFiltradas}
              categoriaSelecionada={categoriaSelecionada}
              onCategoriaClick={(cat) =>
                setCategoriaSelecionada((atual) => (atual === cat ? null : cat))
              }
            />
          </div>

          <div className="flex items-center justify-between mt-5 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Últimos gastos
            </span>
            {categoriaSelecionada && (
              <button
                onClick={() => setCategoriaSelecionada(null)}
                className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand"
              >
                {categoriaSelecionada}
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {despesasDaTabela.length === 0 ? (
            <p className="text-sm text-ink-faint py-6 text-center">Nenhuma despesa encontrada.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-xl border border-line-soft">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-2">
                  <tr className="text-left text-ink-faint">
                    <th className="px-3 py-2 font-medium">
                      <button
                        onClick={() => alternarOrdenacaoTabela('data')}
                        className="flex items-center gap-1 hover:text-ink"
                      >
                        Data
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Categoria</th>
                    <th className="px-3 py-2 font-medium">Subcategoria</th>
                    <th className="px-3 py-2 font-medium text-right">
                      <button
                        onClick={() => alternarOrdenacaoTabela('valor')}
                        className="flex items-center gap-1 hover:text-ink ml-auto"
                      >
                        Valor
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {despesasDaTabela.map((d) => (
                    <tr key={d.id} className="border-t border-line-soft">
                      <td className="px-3 py-2 whitespace-nowrap text-ink-soft">
                        {formatDate(d.data)}
                      </td>
                      <td className="px-3 py-2 text-ink truncate max-w-[160px]">{d.descricao}</td>
                      <td className="px-3 py-2 text-ink-muted whitespace-nowrap">{d.categoria}</td>
                      <td className="px-3 py-2 text-ink-muted whitespace-nowrap">
                        {d.subcategoria}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-ink whitespace-nowrap">
                        {formatCurrency(d.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBase>
      </div>

      {reservas.length > 0 && (
        <div className="mt-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Reserva de emergência
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2.5">
            {reservas.map(({ conta, meta }) => {
              const saldo = calcularSaldo(conta, dadosSaldo)
              const percentual = meta && meta.valorMeta > 0 ? (saldo / meta.valorMeta) * 100 : 0
              return (
                <div
                  key={conta.id}
                  className="rounded-2xl border border-line bg-surface p-5 shadow-sm shadow-slate-900/[0.02]"
                >
                  <div className="flex items-center gap-2 text-ink-muted">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft">
                      <Target className="h-4 w-4 text-brand" strokeWidth={2.1} />
                    </span>
                    <span className="text-sm font-semibold text-ink-soft">{conta.nome}</span>
                  </div>
                  <p className="text-xl font-bold text-ink mt-3 tracking-tight">
                    {formatCurrency(saldo)}{' '}
                    <span className="text-xs font-normal text-ink-faint">
                      de {formatCurrency(meta!.valorMeta)}
                    </span>
                  </p>
                  <div className="h-2 rounded-full bg-surface-2 mt-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.min(percentual, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-brand font-semibold mt-1.5">
                    {percentual.toFixed(0)}% da meta
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
