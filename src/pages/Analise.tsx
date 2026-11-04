import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  PieChart,
  Activity,
  LineChart as LineChartIcon,
  type LucideIcon,
} from 'lucide-react'
import { RitmoMesChart } from '@/components/dashboard/RitmoMesChart'
import { ParaOndeFoi } from '@/components/dashboard/ParaOndeFoi'
import { TrajetoriaSaldo } from '@/components/dashboard/TrajetoriaSaldo'
import { composicaoDoMes, idsDespesasFixas, ritmoDoMes, trajetoriaDoMes } from '@/lib/ritmo'
import { ProjecaoSaldoChart } from '@/components/dashboard/ProjecaoSaldoChart'
import { BancoLogo } from '@/components/shared/BancoLogo'
import { PageHeader } from '@/components/ui/PageHeader'
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
import { calcularSaldo, calcularTotalEmContas } from '@/lib/saldos'
import { projetarFluxoCaixa } from '@/lib/fluxoCaixa'
import { vencimentosDoMes } from '@/lib/dashboardResumo'
import { formatCurrency } from '@/lib/format'
import { useChartColors } from '@/lib/chartTheme'
import {
  detalheAPagar,
  detalheDespesas,
  detalheDisponivel,
  detalheEntradas,
  detalheSobra,
  type Detalhe,
} from '@/lib/detalhes'
import type { SegmentoComposicao } from '@/lib/ritmo'
import { ModalDetalhe } from '@/components/dashboard/ModalDetalhe'
import { hojeIso, somarMeses } from '@/lib/datas'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const ESTILO_NUMERO =
  'rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'

function periodoAtual(): string {
  return new Date().toISOString().slice(0, 7)
}

function labelPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-')
  return `${MESES[Number(mes) - 1]} ${ano}`
}

function splitMoeda(valorFormatado: string): [string, string] {
  const idx = valorFormatado.lastIndexOf(',')
  if (idx === -1) return [valorFormatado, '']
  return [valorFormatado.slice(0, idx), valorFormatado.slice(idx + 1)]
}

function Painel({
  titulo,
  subtitulo,
  icone: Icone,
  acao,
  children,
  className = '',
  ordem = 0,
}: {
  titulo: string
  subtitulo?: string
  icone?: LucideIcon
  acao?: ReactNode
  children: ReactNode
  className?: string
  /** posição na cascata de entrada */
  ordem?: number
}) {
  return (
    <section
      style={{ animationDelay: `${ordem * 60}ms` }}
      className={`animate-surgir rounded-2xl border border-line bg-surface p-5 shadow-card dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icone && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icone className="h-4 w-4" strokeWidth={2.1} />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
            {subtitulo && <p className="text-xs text-ink-faint mt-0.5">{subtitulo}</p>}
          </div>
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

function LinkPainel({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
    >
      {children}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  )
}

export function Analise() {
  const { user } = useAuth()
  const { despesas } = useDespesas()
  const { entradas } = useEntradas()
  const { contas } = useContas()
  const { movimentacoes } = useMovimentacoes()
  const { custosFixos } = useCustosFixos()
  const { pagamentos: pagamentosCustosFixos } = usePagamentosCustosFixos()
  const { parcelas } = useParcelas()
  const { dividas } = useDividas()

  const [periodo, setPeriodo] = useState(periodoAtual())
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
  const cores = useChartColors()

  const hoje = hojeIso()
  const mesHoje = hoje.slice(0, 7)
  const dadosSaldo = { despesas, entradas, movimentacoes }
  const contasAtivas = contas.filter((c) => c.ativa)

  const contaAutomatica = contasAtivas.find((c) => c.tipo === 'AUTOMATICA')
  const dinheiroDisponivel = contaAutomatica ? calcularSaldo(contaAutomatica, dadosSaldo) : 0

  const agora = new Date()
  const diasNoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const diasRestantesMes = diasNoMes - agora.getDate() + 1
  const valorDisponivelPorDia = dinheiroDisponivel > 0 ? dinheiroDisponivel / diasRestantesMes : null
  const totalEmContas = calcularTotalEmContas(contas, dadosSaldo)

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
  const despesasDoPeriodo = useMemo(
    () =>
      despesas.filter((d) => d.data.slice(0, 7) === periodo).reduce((s, d) => s + d.valor, 0),
    [despesas, periodo]
  )
  const resultado = entradasDoPeriodo - despesasDoPeriodo

  const custosFixosAPagar = useMemo(
    () =>
      custosFixos
        .filter(
          (c) =>
            c.ativo &&
            c.dataInicio.slice(0, 7) <= periodo &&
            (!c.dataFim || c.dataFim.slice(0, 7) >= periodo) &&
            !pagamentosCustosFixos.some((p) => p.idCustoFixo === c.id && p.periodo === periodo)
        )
        .reduce((s, c) => s + c.valorPrevisto, 0),
    [custosFixos, pagamentosCustosFixos, periodo]
  )
  const parcelasAPagar = useMemo(
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

  const idsFixos = useMemo(
    () => idsDespesasFixas(parcelas, pagamentosCustosFixos),
    [parcelas, pagamentosCustosFixos]
  )
  const ritmo = useMemo(() => ritmoDoMes(despesas, periodo, hoje), [despesas, periodo, hoje])
  // "ainda vai sair" só faz sentido do mês atual pra frente
  const aindaVaiSair = periodo >= mesHoje ? custosFixosAPagar + parcelasAPagar : 0
  const composicao = useMemo(
    () => composicaoDoMes(despesas, periodo, idsFixos, entradasDoPeriodo, aindaVaiSair),
    [despesas, periodo, idsFixos, entradasDoPeriodo, aindaVaiSair]
  )
  const categoriasDestaque = useMemo(
    () => composicao.filter((c) => c.tipo === 'categoria').map((c) => c.nome),
    [composicao]
  )
  const vencimentosMesHoje = useMemo(
    () =>
      vencimentosDoMes(
        { custosFixos, pagamentos: pagamentosCustosFixos, parcelas, dividas },
        mesHoje,
        hoje
      ),
    [custosFixos, pagamentosCustosFixos, parcelas, dividas, mesHoje, hoje]
  )
  const trajetoria = useMemo(
    () =>
      contaAutomatica
        ? trajetoriaDoMes(
            {
              conta: contaAutomatica,
              despesas,
              entradas,
              movimentacoes,
              vencimentos: vencimentosMesHoje,
              idsFixos,
            },
            hoje
          )
        : null,
    [contaAutomatica, despesas, entradas, movimentacoes, vencimentosMesHoje, idsFixos, hoje]
  )

  const vencimentosDoPeriodo = useMemo(
    () =>
      vencimentosDoMes(
        { custosFixos, pagamentos: pagamentosCustosFixos, parcelas, dividas },
        periodo,
        hoje
      ),
    [custosFixos, pagamentosCustosFixos, parcelas, dividas, periodo, hoje]
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

  // --- modais de detalhe ---
  const ehFixaOuParcela = (id: string) => idsFixos.fixosIds.has(id) || idsFixos.parcelasIds.has(id)

  function abrirDespesas() {
    setDetalhe(
      detalheDespesas({
        titulo: 'Despesas',
        cor: cores.serieDespesa,
        despesas,
        periodo,
        filtro: () => true,
        agruparPor: (d) => d.categoria,
        divisaoTitulo: 'Por categoria',
        totalSaiu: despesasDoPeriodo,
      })
    )
  }

  function abrirSobra() {
    setDetalhe(detalheSobra(entradas, despesas, periodo, cores.income))
  }

  function abrirSegmento(s: SegmentoComposicao, cor: string) {
    const base = { cor, despesas, periodo, totalSaiu: despesasDoPeriodo }
    switch (s.tipo) {
      case 'fixos':
        return setDetalhe(
          detalheDespesas({
            ...base,
            titulo: 'Custos fixos',
            filtro: (d) => idsFixos.fixosIds.has(d.id),
            agruparPor: (d) => d.descricao,
            divisaoTitulo: 'Por conta',
          })
        )
      case 'parcelas':
        return setDetalhe(
          detalheDespesas({
            ...base,
            titulo: 'Parcelas',
            filtro: (d) => idsFixos.parcelasIds.has(d.id),
            agruparPor: (d) => d.descricao,
            divisaoTitulo: 'Por dívida',
          })
        )
      case 'categoria':
        return setDetalhe(
          detalheDespesas({
            ...base,
            titulo: s.nome,
            filtro: (d) => d.categoria === s.nome && !ehFixaOuParcela(d.id),
            agruparPor: (d) => d.subcategoria || 'Sem subcategoria',
            divisaoTitulo: 'Por subcategoria',
          })
        )
      case 'outros':
        return setDetalhe(
          detalheDespesas({
            ...base,
            titulo: 'Outras categorias',
            filtro: (d) => !ehFixaOuParcela(d.id) && !categoriasDestaque.includes(d.categoria),
            agruparPor: (d) => d.categoria,
            divisaoTitulo: 'Por categoria',
          })
        )
      case 'aPagar':
        return setDetalhe(detalheAPagar(vencimentosDoPeriodo, cor))
      case 'sobrou':
        return abrirSobra()
    }
  }

  function abrirDisponivel() {
    if (!contaAutomatica || !trajetoria) return
    setDetalhe(
      detalheDisponivel({
        saldoHoje: dinheiroDisponivel,
        trajetoria,
        diasRestantes: diasRestantesMes,
        vencimentos: vencimentosMesHoje,
        previstas: entradas.filter(
          (e) =>
            e.status === 'PREVISTA' &&
            e.contaDestino === contaAutomatica.nome &&
            e.data.slice(0, 7) === mesHoje &&
            e.data.slice(0, 10) > hoje
        ),
        cor: cores.brand,
      })
    )
  }

  const mesAnterior = somarMeses(`${periodo}-01`, -1).slice(0, 7)
  const proximoMes = somarMeses(`${periodo}-01`, 1).slice(0, 7)
  const [inteiro, centavos] = splitMoeda(formatCurrency(dinheiroDisponivel))

  return (
    <>
      <PageHeader title="Análise" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* coluna esquerda: a conta do dia a dia, pelos lançamentos do app */}
        <div className="lg:col-span-5 space-y-4">
          <section
            role="button"
            tabIndex={0}
            title="Ver como a previsão foi calculada"
            onClick={abrirDisponivel}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && abrirDisponivel()}
            className="animate-surgir relative cursor-pointer overflow-hidden rounded-3xl bg-panel p-6 md:p-7 text-panel-ink shadow-xl shadow-[#5b4cf0]/20 dark:shadow-none transition-shadow hover:ring-1 hover:ring-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#6d5efc]/45 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
                backgroundSize: '18px 18px',
              }}
            />

            <div className="relative">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-white/60">Saldo pelos lançamentos do app</p>
                {contaAutomatica && (
                  <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/70">
                    {contaAutomatica.nome}
                  </span>
                )}
              </div>

              <p className="mt-3 text-[3.4rem] leading-none font-semibold tracking-[-0.045em] truncate">
                {inteiro}
                {centavos && <span className="text-white/35 text-[2.2rem]">,{centavos}</span>}
              </p>

              {!contaAutomatica ? (
                <p className="mt-4 text-xs text-white/60">
                  Crie uma conta do tipo Automática em Contas pra este número funcionar.
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {valorDisponivelPorDia !== null ? (
                    <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-[#0e1016]">
                      {formatCurrency(valorDisponivelPorDia)} por dia
                    </span>
                  ) : (
                    <span className="rounded-full bg-expense/90 px-3 py-1 text-xs font-semibold text-white">
                      Sem saldo pro resto do mês
                    </span>
                  )}
                  <span className="text-xs text-white/50">{diasRestantesMes} dias até virar o mês</span>
                </div>
              )}

              {trajetoria && (
                <div className="mt-5">
                  <TrajetoriaSaldo trajetoria={trajetoria} diaHoje={agora.getDate()} />
                  <p className="mt-2 text-xs text-white/60">
                    {trajetoria.diaZerado ? (
                      <>
                        No seu ritmo, o dinheiro{' '}
                        <b className="font-semibold text-[#ff8a8f]">acaba dia {trajetoria.diaZerado}</b>
                      </>
                    ) : (
                      <>
                        No seu ritmo, você chega ao fim do mês com{' '}
                        <b className="font-semibold text-accent">
                          {formatCurrency(trajetoria.saldoFinal)}
                        </b>
                      </>
                    )}
                  </p>
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[11px] text-white/50">Total em contas</p>
                  <p className="mt-0.5 text-base font-semibold">{formatCurrency(totalEmContas)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/50">Contas a vencer no mês</p>
                  <p className="mt-0.5 text-base font-semibold">
                    {formatCurrency(vencimentosMesHoje.reduce((s, v) => s + v.valor, 0))}
                    {vencimentosMesHoje.length > 0 && (
                      <span className="ml-1.5 text-[11px] font-normal text-white/45">
                        {vencimentosMesHoje.length} conta(s)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {contasAtivas.length > 0 && (
            <Painel
              titulo="Contas no app"
              subtitulo="Saldos calculados pelos seus lançamentos"
              icone={Wallet}
              ordem={2}
            >
              <div className="-my-1 divide-y divide-line-soft">
                {contasAtivas.map((c) => {
                  const saldo = calcularSaldo(c, dadosSaldo)
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-2.5">
                      <BancoLogo nomeConta={c.nome} tamanho={30} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink truncate">{c.nome}</p>
                        <p className="text-[11px] text-ink-faint">
                          {c.tipo === 'AUTOMATICA' ? 'Dia a dia' : 'Reserva'}
                        </p>
                      </div>
                      <p
                        className={`text-sm font-semibold shrink-0 ${saldo < 0 ? 'text-expense' : 'text-ink'}`}
                      >
                        {formatCurrency(saldo)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Painel>
          )}
        </div>

        {/* coluna direita: o mês e o que vem pela frente */}
        <div className="lg:col-span-7 space-y-4">
          <Painel
            titulo="Resumo do mês"
            icone={PieChart}
            ordem={1}
            acao={
              <div className="flex items-center rounded-xl border border-line bg-surface-2/60 p-0.5">
                <button
                  onClick={() => setPeriodo(mesAnterior)}
                  aria-label="Mês anterior"
                  className="rounded-lg p-1 text-ink-faint hover:bg-surface hover:text-ink"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs font-semibold text-ink min-w-[104px] text-center">
                  {labelPeriodo(periodo)}
                </span>
                <button
                  onClick={() => setPeriodo(proximoMes)}
                  aria-label="Próximo mês"
                  className="rounded-lg p-1 text-ink-faint hover:bg-surface hover:text-ink"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            }
          >
            <div className="-mx-3 mb-4 grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setDetalhe(detalheEntradas(entradas, periodo, cores.serieEntrada))}
                className={ESTILO_NUMERO}
              >
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-income" />
                  Entrou
                </span>
                <span className="mt-1 block text-lg sm:text-xl font-semibold tracking-tight text-ink">
                  {formatCurrency(entradasDoPeriodo)}
                </span>
                {entradasPrevistasDoPeriodo > 0 && (
                  <span className="block text-[11px] text-ink-faint">
                    + {formatCurrency(entradasPrevistasDoPeriodo)} previstas
                  </span>
                )}
              </button>
              <button type="button" onClick={abrirDespesas} className={ESTILO_NUMERO}>
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <ArrowUpRight className="h-3.5 w-3.5 text-expense" />
                  Saiu
                </span>
                <span className="mt-1 block text-lg sm:text-xl font-semibold tracking-tight text-ink">
                  {formatCurrency(despesasDoPeriodo)}
                </span>
              </button>
              <button type="button" onClick={abrirSobra} className={ESTILO_NUMERO}>
                <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                  {resultado >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-income" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-expense" />
                  )}
                  Sobrou
                </span>
                <span
                  className={`mt-1 block text-lg sm:text-xl font-semibold tracking-tight ${resultado >= 0 ? 'text-income' : 'text-expense'}`}
                >
                  {resultado >= 0 ? '+' : ''}
                  {formatCurrency(resultado)}
                </span>
              </button>
            </div>

            <p className="mb-1 text-xs font-medium text-ink-muted">
              Para onde foi o dinheiro{' '}
              <span className="font-normal text-ink-faint">· clique num pedaço pra detalhar</span>
            </p>
            <ParaOndeFoi
              segmentos={composicao}
              entradas={entradasDoPeriodo}
              onSelecionar={abrirSegmento}
            />
          </Painel>

          <Painel
            titulo="Ritmo do mês"
            subtitulo="Gasto acumulado dia a dia, comparado com o seu normal"
            icone={Activity}
            ordem={2}
            acao={<LinkPainel to="/despesas">Despesas</LinkPainel>}
          >
            <RitmoMesChart ritmo={ritmo} />
          </Painel>

          <Painel
            titulo="Saldo projetado"
            subtitulo="Todas as contas, próximos 6 meses"
            icone={LineChartIcon}
            ordem={3}
            acao={
              user?.email === EMAIL_MASTER ? (
                <LinkPainel to="/fluxo-de-caixa">Fluxo</LinkPainel>
              ) : undefined
            }
          >
            {projecao.length ? (
              <ProjecaoSaldoChart linhas={projecao.slice(0, 6)} />
            ) : (
              <p className="text-sm text-ink-faint py-8 text-center">
                Cadastre uma conta para projetar.
              </p>
            )}
          </Painel>
        </div>
      </div>

      {detalhe && <ModalDetalhe detalhe={detalhe} onClose={() => setDetalhe(null)} />}
    </>
  )
}
