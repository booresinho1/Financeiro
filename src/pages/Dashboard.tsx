import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingDown,
  Target,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Landmark,
  PiggyBank,
  ArrowUpRight,
  CalendarDays,
  PieChart,
  CreditCard,
  type LucideIcon,
} from 'lucide-react'
import {
  composicaoDoMes,
  idsDespesasFixas,
  colorirSegmentos,
  grupoDaDespesa,
} from '@/lib/ritmo'
import type { Despesa, TransacaoPendente } from '@/types/finance'
import { CardsBancos } from '@/components/dashboard/CardsBancos'
import { CalendarioMes } from '@/components/dashboard/CalendarioMes'
import { ModalDetalhe } from '@/components/dashboard/ModalDetalhe'
import { PainelCaixa, type CliqueCaixa } from '@/components/inicio/PainelCaixa'
import { PainelOrcamentos } from '@/components/inicio/PainelOrcamentos'
import { useAuth } from '@/contexts/AuthContext'
import { EMAIL_MASTER } from '@/lib/navigation'
import { useDespesas } from '@/hooks/useDespesas'
import { useEntradas } from '@/hooks/useEntradas'
import { useContas } from '@/hooks/useContas'
import { useMovimentacoes } from '@/hooks/useMovimentacoes'
import { useCustosFixos } from '@/hooks/useCustosFixos'
import { usePagamentosCustosFixos } from '@/hooks/usePagamentosCustosFixos'
import { useParcelas } from '@/hooks/useParcelas'
import { useDividas } from '@/hooks/useDividas'
import { useMetas } from '@/hooks/useMetas'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { useSaldosBancos } from '@/hooks/useSaldosBancos'
import { useCartoes } from '@/hooks/useCartoes'
import { pluggyRepository } from '@/repositories/pluggyRepository'
import { calcularSaldo } from '@/lib/saldos'
import { projetarFluxoCaixa } from '@/lib/fluxoCaixa'
import { proximosVencimentos, orcamentosEstourados, vencimentosDoMes } from '@/lib/dashboardResumo'
import { formatCurrency, formatDate, nomeBonito } from '@/lib/format'
import { useChartColors } from '@/lib/chartTheme'
import { detalheAPagar, detalheDespesas, type Detalhe } from '@/lib/detalhes'
import {
  calcularCaixa,
  detalheEntradasPrevistas,
  detalheFatura,
  detalheSaldoContas,
  detalheSobraDoMes,
  resumirOrcamentos,
  somarDias,
  type LinhaOrcamento,
} from '@/lib/inicio'
import { hojeIso, somarMeses } from '@/lib/datas'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DIAS_VENCIMENTOS = 15
const DIAS_AVISO_FATURA = 7

function periodoAtual(): string {
  return new Date().toISOString().slice(0, 7)
}

function labelPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-')
  return `${MESES[Number(mes) - 1]} ${ano}`
}

function labelMesCurto(periodo: string): string {
  const [ano, mes] = periodo.split('-')
  return `${MESES[Number(mes) - 1].slice(0, 3).toLowerCase()}/${ano.slice(2)}`
}

interface Alerta {
  id: string
  icone: LucideIcon
  texto: ReactNode
  to: string
  grave: boolean
}

export function Dashboard() {
  const { user } = useAuth()
  // bancos e cartão são só do dono da conta: os demais usuários usam o saldo pelos lançamentos
  const temBanco = user?.email === EMAIL_MASTER

  const { despesas, carregando: carregandoDespesas } = useDespesas()
  const { entradas, carregando: carregandoEntradas } = useEntradas()
  const { contas, carregando: carregandoContas } = useContas()
  const { movimentacoes, carregando: carregandoMovimentacoes } = useMovimentacoes()
  const { custosFixos } = useCustosFixos()
  const { pagamentos: pagamentosCustosFixos } = usePagamentosCustosFixos()
  const { parcelas } = useParcelas()
  const { dividas } = useDividas()
  const { metas } = useMetas()
  const { orcamentos } = useOrcamentos()
  const { bancos, carregando: carregandoBancos, erro: erroBancos } = useSaldosBancos(temBanco)
  const { cartoes, carregando: carregandoCartoes, erro: erroCartoes } = useCartoes(temBanco)
  const carregandoCaixa =
    carregandoBancos ||
    carregandoCartoes ||
    carregandoDespesas ||
    carregandoEntradas ||
    carregandoContas ||
    carregandoMovimentacoes

  const [periodo, setPeriodo] = useState(periodoAtual())
  const [pendentes, setPendentes] = useState<TransacaoPendente[]>([])
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
  const cores = useChartColors()

  // a fila do Pluggy é opcional: se a integração não estiver configurada, só não mostra o alerta
  useEffect(() => {
    if (!temBanco) return
    pluggyRepository
      .listarPendentes()
      .then((lista) => setPendentes(lista.filter((t) => t.status === 'PENDENTE')))
      .catch(() => setPendentes([]))
  }, [temBanco])

  const hoje = hojeIso()
  const mesHoje = hoje.slice(0, 7)
  const dadosSaldo = { despesas, entradas, movimentacoes }
  const contaAutomatica = contas.filter((c) => c.ativa).find((c) => c.tipo === 'AUTOMATICA')
  const saldoNoApp = contaAutomatica
    ? {
        id: contaAutomatica.id,
        nome: contaAutomatica.nome,
        saldo: calcularSaldo(contaAutomatica, dadosSaldo),
      }
    : null

  const dadosVencimentos = useMemo(
    () => ({ custosFixos, pagamentos: pagamentosCustosFixos, parcelas, dividas }),
    [custosFixos, pagamentosCustosFixos, parcelas, dividas]
  )
  const vencimentos = useMemo(
    () => proximosVencimentos(dadosVencimentos, hoje, DIAS_VENCIMENTOS),
    [dadosVencimentos, hoje]
  )
  const vencimentosMesHoje = useMemo(
    () => vencimentosDoMes(dadosVencimentos, mesHoje, hoje),
    [dadosVencimentos, mesHoje, hoje]
  )
  const vencimentosDoPeriodo = useMemo(
    () => vencimentosDoMes(dadosVencimentos, periodo, hoje),
    [dadosVencimentos, periodo, hoje]
  )
  const idsFixos = useMemo(
    () => idsDespesasFixas(parcelas, pagamentosCustosFixos),
    [parcelas, pagamentosCustosFixos]
  )

  const caixa = calcularCaixa(
    {
      bancos,
      saldoNoApp,
      cartoes,
      vencimentosDoMes: vencimentosMesHoje,
      parcelas,
      dividas,
      entradas,
      despesas,
      idsFixos,
    },
    hoje
  )

  const avisosCaixa = [
    ...(erroBancos ? ['Não consegui ler os bancos: o saldo usa os lançamentos do app.'] : []),
    ...(erroCartoes && caixa.origemSaldo === 'banco'
      ? ['Não consegui ler o cartão: a fatura está fora dessa conta.']
      : []),
  ]

  const resumoOrcamentos = useMemo(
    () => resumirOrcamentos(orcamentos, despesas, periodo, hoje),
    [orcamentos, despesas, periodo, hoje]
  )
  const comprasNaFila = useMemo(() => {
    const doMes = pendentes.filter(
      (t) => t.tipo === 'DESPESA' && (t.dataCompra ?? t.data).slice(0, 7) === periodo
    )
    return { quantidade: doMes.length, valor: doMes.reduce((s, t) => s + t.valor, 0) }
  }, [pendentes, periodo])

  // o calendário usa os mesmos pedaços e cores da barra "Para onde foi", da Análise
  const composicao = useMemo(
    () => composicaoDoMes(despesas, periodo, idsFixos, 0, 0),
    [despesas, periodo, idsFixos]
  )
  const categoriasDestaque = useMemo(
    () => composicao.filter((c) => c.tipo === 'categoria').map((c) => c.nome),
    [composicao]
  )
  const gruposCalendario = useMemo(
    () =>
      colorirSegmentos(composicao, cores)
        .filter((s) => ['fixos', 'parcelas', 'categoria', 'outros'].includes(s.tipo))
        .map((s) => ({ id: s.id, nome: nomeBonito(s.nome), cor: s.cor })),
    [composicao, cores]
  )
  const grupoDe = useCallback(
    (d: Despesa) => grupoDaDespesa(d, idsFixos, categoriasDestaque),
    [idsFixos, categoriasDestaque]
  )

  const projecao = useMemo(
    () =>
      projetarFluxoCaixa(
        {
          contas,
          despesas,
          entradas,
          movimentacoes,
          custosFixos,
          pagamentos: pagamentosCustosFixos,
          parcelas,
        },
        hoje,
        12
      ),
    [contas, despesas, entradas, movimentacoes, custosFixos, pagamentosCustosFixos, parcelas, hoje]
  )

  const alertas = useMemo(() => {
    const lista: Alerta[] = []
    // com saldo do banco, o painel logo abaixo já responde; a projeção usa os lançamentos e daria outro número
    const negativo = caixa.origemSaldo === 'app' && projecao.find((l) => l.saldo < 0)
    if (negativo) {
      lista.push({
        id: 'saldo',
        icone: TrendingDown,
        texto: <>Saldo projetado negativo em {labelMesCurto(negativo.mes)}</>,
        to: '/analise',
        grave: true,
      })
    }
    const vencidos = vencimentos.filter((v) => v.vencido)
    if (vencidos.length) {
      lista.push({
        id: 'vencidos',
        icone: AlertTriangle,
        texto: (
          <>
            {vencidos.length} conta(s) vencida(s) ·{' '}
            {formatCurrency(vencidos.reduce((s, v) => s + v.valor, 0))}
          </>
        ),
        to: '/custos-fixos',
        grave: true,
      })
    }
    for (const c of cartoes) {
      const vencimento = c.faturaAberta.vencimentoEstimado
      if (!vencimento || vencimento > somarDias(hoje, DIAS_AVISO_FATURA)) continue
      lista.push({
        id: `fatura-${c.id}`,
        icone: CreditCard,
        texto: (
          <>
            Fatura {c.banco} vence ~{formatDate(vencimento).slice(0, 5)} ·{' '}
            {formatCurrency(c.faturaAberta.total)}
          </>
        ),
        to: '/cartao',
        grave: false,
      })
    }
    for (const o of orcamentosEstourados(orcamentos, despesas, mesHoje)) {
      lista.push({
        id: `orc-${o.nome}`,
        icone: PiggyBank,
        texto: (
          <>
            {nomeBonito(o.nome)} em {o.percentual.toFixed(0)}% do orçamento
          </>
        ),
        to: '/orcamentos',
        grave: false,
      })
    }
    if (pendentes.length > 0) {
      lista.push({
        id: 'pluggy',
        icone: Landmark,
        texto: <>{pendentes.length} transação(ões) para conciliar</>,
        to: '/bancos',
        grave: false,
      })
    }
    return lista
  }, [caixa.origemSaldo, projecao, vencimentos, cartoes, orcamentos, despesas, mesHoje, pendentes, hoje])

  const reservas = useMemo(
    () =>
      contas
        .filter((c) => c.tipo === 'MANUAL' && c.ativa)
        .map((c) => ({ conta: c, meta: metas.find((m) => m.idConta === c.id) }))
        .filter((r) => r.meta),
    [contas, metas]
  )

  // --- modais de detalhe ---
  function abrirCaixa(qual: CliqueCaixa) {
    switch (qual) {
      case 'saldo':
        return setDetalhe(detalheSaldoContas(caixa, hoje, cores.income))
      case 'entradas':
        return setDetalhe(detalheEntradasPrevistas(caixa, cores.income))
      case 'fatura':
        return setDetalhe(detalheFatura(cartoes, cores.brand))
      case 'parcelas':
        return setDetalhe({
          ...detalheAPagar(caixa.parcelas, cores.serieDespesa),
          titulo: 'Parcelas de dívidas',
          subtitulo: 'O que vence neste mês e o que ficou atrasado',
          divisao: undefined,
        })
      case 'fixos':
        return setDetalhe({
          ...detalheAPagar(caixa.fixos, cores.composicao[2]),
          titulo: 'Custos fixos do mês',
          subtitulo: 'Ainda sem pagamento registrado',
          divisao: undefined,
        })
      case 'sobra':
        return setDetalhe(detalheSobraDoMes(caixa, caixa.sobra < 0 ? cores.expense : cores.income))
    }
  }

  function abrirOrcamento(l: LinhaOrcamento) {
    const titulo = l.subcategoria ? `${l.categoria} / ${l.subcategoria}` : l.categoria
    const totalSaiu = despesas
      .filter((d) => d.data.slice(0, 7) === periodo)
      .reduce((s, d) => s + d.valor, 0)
    setDetalhe({
      ...detalheDespesas({
        titulo,
        cor: cores.brand,
        despesas,
        periodo,
        filtro: (d) =>
          d.categoria === l.categoria && (!l.subcategoria || d.subcategoria === l.subcategoria),
        agruparPor: (d) => d.subcategoria || 'Sem subcategoria',
        divisaoTitulo: 'Por subcategoria',
        totalSaiu,
      }),
      subtitulo:
        l.resta >= 0
          ? `Orçamento de ${formatCurrency(l.orcado)} · restam ${formatCurrency(l.resta)}`
          : `Orçamento de ${formatCurrency(l.orcado)} · ${formatCurrency(-l.resta)} acima`,
    })
  }

  const navegacaoMes = (
    <div className="flex items-center rounded-xl border border-line bg-surface-2/60 p-0.5">
      <button
        onClick={() => setPeriodo(somarMeses(`${periodo}-01`, -1).slice(0, 7))}
        aria-label="Mês anterior"
        className="rounded-lg p-1 text-ink-faint hover:bg-surface hover:text-ink"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="px-2 text-xs font-semibold text-ink min-w-[104px] text-center">
        {labelPeriodo(periodo)}
      </span>
      <button
        onClick={() => setPeriodo(somarMeses(`${periodo}-01`, 1).slice(0, 7))}
        aria-label="Próximo mês"
        className="rounded-lg p-1 text-ink-faint hover:bg-surface hover:text-ink"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )

  return (
    <>
      {alertas.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {alertas.map((a) => (
            <Link
              key={a.id}
              to={a.to}
              className="animate-surgir group flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3.5 text-xs font-medium shadow-card transition-all hover:-translate-y-px hover:border-line hover:shadow-md"
            >
              <span
                className={`relative flex h-6 w-6 items-center justify-center rounded-full ${a.grave ? 'bg-expense-soft text-expense' : 'bg-warning-soft text-warning'}`}
              >
                <a.icone className="h-3.5 w-3.5" />
                {a.grave && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-expense ring-2 ring-surface" />
                )}
              </span>
              <span className="text-ink-soft">{a.texto}</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" />
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <PainelCaixa
          caixa={caixa}
          hoje={hoje}
          carregando={carregandoCaixa}
          avisos={avisosCaixa}
          onClique={abrirCaixa}
        />

        <PainelOrcamentos
          resumo={resumoOrcamentos}
          sobraDoMes={
            periodo === mesHoje && !carregandoCaixa && caixa.contas.length > 0 ? caixa.sobra : null
          }
          comprasNaFila={comprasNaFila}
          navegacaoMes={navegacaoMes}
          onSelecionar={abrirOrcamento}
        />

        <section
          style={{ animationDelay: '120ms' }}
          className="animate-surgir rounded-2xl border border-line bg-surface p-5 shadow-card dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <CalendarDays className="h-4 w-4" strokeWidth={2.1} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-ink">Calendário de {labelPeriodo(periodo)}</h3>
                <p className="text-xs text-ink-faint mt-0.5">
                  Clique num dia para ver o saldo e o que aconteceu nele
                </p>
              </div>
            </div>
            {navegacaoMes}
          </div>
          <CalendarioMes
            periodo={periodo}
            hoje={hoje}
            despesas={despesas}
            entradas={entradas}
            movimentacoes={movimentacoes}
            vencimentos={vencimentosDoPeriodo}
            contaAutomatica={contaAutomatica}
            grupos={gruposCalendario}
            grupoDe={grupoDe}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {temBanco && (
            <div className={reservas.length > 0 ? 'lg:col-span-5' : 'lg:col-span-8'}>
              <CardsBancos bancos={bancos} carregando={carregandoBancos} erro={erroBancos} />
            </div>
          )}

          {reservas.length > 0 && (
            <div className={temBanco ? 'lg:col-span-4' : 'lg:col-span-8'}>
              <h3 className="mb-3 px-1 pt-1 text-sm font-semibold text-ink">Reservas</h3>
              <div className="space-y-3">
                {reservas.map(({ conta, meta }) => {
                  const saldo = calcularSaldo(conta, dadosSaldo)
                  const percentual = meta && meta.valorMeta > 0 ? (saldo / meta.valorMeta) * 100 : 0
                  return (
                    <div
                      key={conta.id}
                      className="rounded-2xl border border-line bg-surface p-5 shadow-card"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft">
                          <Target className="h-4 w-4 text-brand" strokeWidth={2.1} />
                        </span>
                        <span className="text-sm font-semibold text-ink">{conta.nome}</span>
                        <span className="ml-auto text-xs font-semibold text-brand">
                          {percentual.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xl font-semibold text-ink mt-3 tracking-tight">
                        {formatCurrency(saldo)}{' '}
                        <span className="text-xs font-normal text-ink-faint">
                          de {formatCurrency(meta!.valorMeta)}
                        </span>
                      </p>
                      <div className="h-2 rounded-full bg-brand-soft mt-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${Math.min(percentual, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Link
            to="/analise"
            className={`group flex items-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop ${
              temBanco && reservas.length > 0
                ? 'lg:col-span-3'
                : temBanco || reservas.length > 0
                  ? 'lg:col-span-4'
                  : 'lg:col-span-12'
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <PieChart className="h-5 w-5" strokeWidth={2.1} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">Ver análise</span>
              <span className="block text-xs text-ink-faint">Para onde foi, ritmo e projeção</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>

      {detalhe && <ModalDetalhe detalhe={detalhe} onClose={() => setDetalhe(null)} />}
    </>
  )
}
