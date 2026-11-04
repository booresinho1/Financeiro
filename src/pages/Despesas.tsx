import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { BarrasDoPeriodo } from '@/components/despesas/BarrasDoPeriodo'
import { DespesaFormModal } from '@/components/despesas/DespesaFormModal'
import { GastoPorDiaSemanaChart } from '@/components/dashboard/GastoPorDiaSemanaChart'
import { useDespesas } from '@/hooks/useDespesas'
import { useParcelas } from '@/hooks/useParcelas'
import { usePagamentosCustosFixos } from '@/hooks/usePagamentosCustosFixos'
import { hojeIso, somarMeses } from '@/lib/datas'
import {
  agruparPorDia,
  descricaoLimpa,
  nomeDoMes,
  rankingPorCategoria,
  rankingPorSubcategoria,
  resumirDespesas,
  type LinhaRanking,
} from '@/lib/despesasPainel'
import { emojiDaCategoria } from '@/lib/emojiCategoria'
import { baixarCsv } from '@/lib/exportCsv'
import { formatCurrency, formatDate, nomeBonito } from '@/lib/format'
import { somarDias } from '@/lib/inicio'
import { idsDespesasFixas } from '@/lib/ritmo'
import type { Despesa } from '@/types/finance'
import type { NovaDespesa } from '@/repositories/despesasRepository'

type Ordem = 'recentes' | 'maior' | 'menor' | 'az'

const ORDENS: { id: Ordem; nome: string }[] = [
  { id: 'recentes', nome: 'Mais recentes' },
  { id: 'maior', nome: 'Maior valor' },
  { id: 'menor', nome: 'Menor valor' },
  { id: 'az', nome: 'Descrição, A a Z' },
]

const LANCAMENTOS_POR_VEZ = 60
const CATEGORIAS_FECHADAS = 4

function tituloDoPeriodo(periodo: string | null): string {
  if (!periodo) return 'Todo o histórico'
  const nome = nomeDoMes(periodo)
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} ${periodo.slice(0, 4)}`
}

function tituloDoDia(data: string, hoje: string): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  const extenso = new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  if (data === hoje) return `Hoje, ${extenso}`
  if (data === somarDias(hoje, -1)) return `Ontem, ${extenso}`
  return extenso
}

function Variacao({ linha }: { linha: LinhaRanking }) {
  if (linha.anterior === null) return null
  if (linha.anterior === 0) return <span className="text-[11px] text-ink-faint">novo</span>
  const variacao = ((linha.valor - linha.anterior) / linha.anterior) * 100
  if (Math.abs(variacao) < 1) return <span className="text-[11px] text-ink-faint">igual</span>
  return (
    <span className={`text-[11px] font-medium ${variacao > 0 ? 'text-expense' : 'text-income'}`}>
      {variacao > 0 ? '↑' : '↓'} {Math.abs(variacao).toFixed(0)}%
    </span>
  )
}

function BarraRanking({
  linha,
  ativa,
  emoji,
  onClick,
}: {
  linha: LinhaRanking
  ativa: boolean
  emoji?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={`block w-full rounded-xl px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        ativa ? 'bg-brand-soft' : 'hover:bg-surface-2'
      }`}
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className={`min-w-0 truncate text-sm ${ativa ? 'font-semibold text-brand' : 'text-ink-soft'}`}>
          {emoji && <span aria-hidden>{emoji} </span>}
          {nomeBonito(linha.nome)}
        </span>
        <span className="shrink-0 text-sm font-semibold text-ink">{formatCurrency(linha.valor)}</span>
      </span>
      <span className="mt-1.5 flex items-center gap-2.5">
        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full rounded-full bg-brand"
            style={{ width: `${Math.min(linha.percentual, 100)}%` }}
          />
        </span>
        <span className="w-8 shrink-0 text-right text-[11px] text-ink-faint">
          {linha.percentual.toFixed(0)}%
        </span>
        <span className="w-10 shrink-0 text-right">
          <Variacao linha={linha} />
        </span>
      </span>
    </button>
  )
}

function LinhaDespesa({
  despesa,
  tipo,
  mostrarData,
  onEditar,
  onExcluir,
}: {
  despesa: Despesa
  tipo: 'Fixo' | 'Parcela' | null
  mostrarData: boolean
  onEditar: () => void
  onExcluir: () => void
}) {
  return (
    <li className="group flex items-center gap-1 pr-1.5 transition-colors hover:bg-surface-2/60">
      <button
        type="button"
        onClick={onEditar}
        title={`Editar: ${despesa.descricao}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-lg"
        >
          {emojiDaCategoria(despesa.categoria)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">
            {descricaoLimpa(despesa.descricao)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-ink-faint">
            <span className="min-w-0 truncate">
              {mostrarData && `${formatDate(despesa.data).slice(0, 5)} · `}
              {nomeBonito(despesa.categoria)}
              {despesa.subcategoria && ` · ${despesa.subcategoria}`}
            </span>
            {tipo && (
              <span className="shrink-0 rounded bg-surface-2 px-1.5 py-px text-[10px] font-medium text-ink-muted">
                {tipo}
              </span>
            )}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-ink">{formatCurrency(despesa.valor)}</span>
      </button>
      <span aria-hidden className="hidden text-ink-faint md:inline-flex md:opacity-0 md:group-hover:opacity-100">
        <Pencil className="h-3.5 w-3.5" />
      </span>
      <button
        type="button"
        aria-label={`Excluir ${despesa.descricao}`}
        title="Excluir"
        onClick={onExcluir}
        className="shrink-0 rounded-lg p-2 text-ink-faint transition-opacity hover:bg-expense-soft hover:text-expense focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
}

function FiltroAtivo({ rotulo, onLimpar }: { rotulo: string; onLimpar: () => void }) {
  return (
    <button
      type="button"
      onClick={onLimpar}
      className="flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand"
    >
      {rotulo}
      <X className="h-3 w-3" />
      <span className="sr-only">Remover filtro</span>
    </button>
  )
}

export function Despesas() {
  const { despesas, carregando, erro, atualizar, excluir } = useDespesas()
  const { parcelas } = useParcelas()
  const { pagamentos } = usePagamentosCustosFixos()

  const hoje = hojeIso()
  const mesDeHoje = hoje.slice(0, 7)

  const [periodo, setPeriodo] = useState<string | null>(mesDeHoje)
  const [categoria, setCategoria] = useState<string | null>(null)
  const [subcategoria, setSubcategoria] = useState<string | null>(null)
  const [dia, setDia] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('recentes')
  const [categoriasAbertas, setCategoriasAbertas] = useState(false)
  const [despesaEditando, setDespesaEditando] = useState<Despesa | undefined>()

  const ids = useMemo(() => idsDespesasFixas(parcelas, pagamentos), [parcelas, pagamentos])
  const tipoDe = (d: Despesa) =>
    ids.fixosIds.has(d.id) ? 'Fixo' : ids.parcelasIds.has(d.id) ? 'Parcela' : null

  const termo = busca.trim().toLowerCase()

  // categoria e busca valem para o mês anterior também, para a comparação falar da mesma coisa
  const filtradas = useMemo(
    () =>
      despesas.filter(
        (d) =>
          (!categoria || d.categoria === categoria) &&
          (!subcategoria || (d.subcategoria || 'Sem subcategoria') === subcategoria) &&
          (!termo ||
            d.descricao.toLowerCase().includes(termo) ||
            d.categoria.toLowerCase().includes(termo) ||
            d.subcategoria.toLowerCase().includes(termo))
      ),
    [despesas, categoria, subcategoria, termo]
  )

  const resumo = useMemo(() => resumirDespesas(filtradas, periodo, hoje), [filtradas, periodo, hoje])

  // o ranking ignora o filtro de categoria: a escolhida não pode sumir com as outras
  const categorias = useMemo(() => rankingPorCategoria(despesas, periodo, hoje), [despesas, periodo, hoje])
  const subcategorias = useMemo(
    () =>
      categoria
        ? rankingPorSubcategoria(
            despesas.filter((d) => d.categoria === categoria),
            periodo,
            hoje
          )
        : [],
    [despesas, categoria, periodo, hoje]
  )

  const lista = useMemo(() => {
    const doPeriodo = filtradas.filter(
      (d) => (!periodo || d.data.slice(0, 7) === periodo) && (!dia || d.data.slice(0, 10) === dia)
    )
    return [...doPeriodo].sort((a, b) => {
      if (ordem === 'maior') return b.valor - a.valor
      if (ordem === 'menor') return a.valor - b.valor
      if (ordem === 'az') return descricaoLimpa(a.descricao).localeCompare(descricaoLimpa(b.descricao))
      return b.data.localeCompare(a.data)
    })
  }, [filtradas, periodo, dia, ordem])

  // a quantidade mostrada volta ao início quando o que está sendo visto muda
  const assinatura = [periodo, categoria, subcategoria, dia, termo, ordem].join('|')
  const [limiteSalvo, setLimiteSalvo] = useState({ assinatura, quantos: LANCAMENTOS_POR_VEZ })
  const limite = limiteSalvo.assinatura === assinatura ? limiteSalvo.quantos : LANCAMENTOS_POR_VEZ

  const visiveis = lista.slice(0, limite)
  const totalDaLista = lista.reduce((s, d) => s + d.valor, 0)
  const grupos = ordem === 'recentes' ? agruparPorDia(visiveis) : null

  function irParaMes(novo: string | null) {
    setPeriodo(novo)
    setDia(null)
  }

  function escolherCategoria(nome: string) {
    setCategoria((atual) => (atual === nome ? null : nome))
    setSubcategoria(null)
    setDia(null)
  }

  function limparFiltros() {
    setCategoria(null)
    setSubcategoria(null)
    setDia(null)
    setBusca('')
  }

  async function handleExcluir(despesa: Despesa) {
    const tipo = tipoDe(despesa)
    const aviso = tipo
      ? `\n\nEste lançamento é o pagamento de ${tipo === 'Fixo' ? 'um custo fixo' : 'uma parcela'}, que continuará marcado como pago.`
      : ''
    if (!confirm(`Excluir "${descricaoLimpa(despesa.descricao)}" (${formatCurrency(despesa.valor)})?${aviso}`)) return
    await excluir(despesa.id)
  }

  function handleBaixarRelatorio() {
    const linhas = lista.map((d) => [
      formatDate(d.data),
      d.descricao,
      d.valor.toFixed(2).replace('.', ','),
      d.categoria,
      d.subcategoria,
    ])
    linhas.push(['', '', '', '', ''])
    linhas.push(['Total', '', totalDaLista.toFixed(2).replace('.', ','), '', ''])
    baixarCsv(
      `despesas-${periodo ?? 'todos-periodos'}.csv`,
      ['Data', 'Descrição', 'Valor', 'Categoria', 'Subcategoria'],
      linhas
    )
  }

  const temFiltro = !!(categoria || subcategoria || dia || termo)
  const diferenca = resumo.comparacao ? resumo.total - resumo.comparacao.anterior : null
  const percentualDiferenca =
    resumo.comparacao && resumo.comparacao.anterior > 0 && diferenca !== null
      ? Math.abs((diferenca / resumo.comparacao.anterior) * 100)
      : null
  const categoriasVisiveis = categoriasAbertas ? categorias : categorias.slice(0, CATEGORIAS_FECHADAS)

  return (
    <>
      <PageHeader
        title="Despesas"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl border border-line bg-surface p-0.5">
              <button
                onClick={() => irParaMes(somarMeses(`${periodo ?? mesDeHoje}-01`, -1).slice(0, 7))}
                aria-label="Mês anterior"
                className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[132px] px-2 text-center text-sm font-semibold text-ink">
                {tituloDoPeriodo(periodo)}
              </span>
              <button
                onClick={() => irParaMes(somarMeses(`${periodo ?? mesDeHoje}-01`, 1).slice(0, 7))}
                disabled={!periodo || periodo >= mesDeHoje}
                aria-label="Próximo mês"
                className="rounded-lg p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => irParaMes(periodo ? null : mesDeHoje)}
              aria-pressed={!periodo}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                periodo
                  ? 'border-line bg-surface text-ink-soft hover:bg-surface-2'
                  : 'border-brand bg-brand-soft text-brand'
              }`}
            >
              Tudo
            </button>
            <Button
              variant="secondary"
              onClick={handleBaixarRelatorio}
              disabled={lista.length === 0}
              icon={<Download className="h-4 w-4" />}
            >
              Baixar
            </Button>
          </div>
        }
      />

      {erro && (
        <div className="mb-4 rounded-xl border border-expense/25 bg-expense-soft px-4 py-3 text-sm text-expense">
          {erro}
        </div>
      )}

      <section className="animate-surgir relative mb-4 rounded-3xl bg-panel p-5 text-panel-ink shadow-xl shadow-[#5b4cf0]/20 dark:shadow-none md:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#6d5efc]/40 blur-3xl" />
        </div>

        {carregando ? (
          <div className="relative space-y-3">
            <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-12 w-64 max-w-full animate-pulse rounded-xl bg-white/10" />
            <div className="h-32 animate-pulse rounded-xl bg-white/[0.06]" />
          </div>
        ) : (
          <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="truncate text-xs font-medium text-white/60">
                {categoria ? `${nomeBonito(subcategoria ?? categoria)} · ` : ''}
                {tituloDoPeriodo(periodo)}
              </p>
              <p className="mt-2 truncate text-[2.6rem] font-semibold leading-none tracking-[-0.045em]">
                {formatCurrency(resumo.total)}
              </p>

              {resumo.comparacao && diferenca !== null && Math.abs(diferenca) >= 0.01 && (
                <p
                  className={`mt-3 flex items-start gap-1.5 text-xs ${diferenca > 0 ? 'text-[#f5b341]' : 'text-accent'}`}
                >
                  {diferenca > 0 ? (
                    <TrendingUp className="mt-px h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <TrendingDown className="mt-px h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    {formatCurrency(Math.abs(diferenca))} a {diferenca > 0 ? 'mais' : 'menos'}
                    {percentualDiferenca !== null && ` (${percentualDiferenca.toFixed(0)}%)`} que{' '}
                    {resumo.comparacao.rotulo}
                  </span>
                </p>
              )}

              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
                <div className="min-w-0">
                  <dt className="text-[11px] text-white/50">
                    Por {resumo.media?.unidade ?? 'dia'}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold">
                    {resumo.media ? formatCurrency(resumo.media.valor) : '—'}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-white/50">Lançamentos</dt>
                  <dd className="mt-0.5 text-sm font-semibold">{resumo.qtd}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] text-white/50">Maior gasto</dt>
                  <dd
                    className="mt-0.5 truncate text-sm font-semibold"
                    title={resumo.maior ? descricaoLimpa(resumo.maior.descricao) : undefined}
                  >
                    {resumo.maior ? formatCurrency(resumo.maior.valor) : '—'}
                  </dd>
                  {resumo.maior && (
                    <dd className="truncate text-[11px] text-white/50">
                      {descricaoLimpa(resumo.maior.descricao)}
                    </dd>
                  )}
                </div>
              </dl>
            </div>

            <div className="min-w-0 lg:col-span-7">
              <p className="mb-5 text-xs font-medium text-white/60">
                {periodo ? 'Gasto por dia · clique para filtrar' : 'Gasto por mês · clique para abrir'}
              </p>
              <BarrasDoPeriodo
                barras={resumo.barras}
                selecionada={dia}
                hoje={hoje}
                media={resumo.media?.valor ?? null}
                onSelecionar={(chave) =>
                  periodo ? setDia((atual) => (atual === chave ? null : chave)) : irParaMes(chave)
                }
              />
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <section className="order-2 min-w-0 rounded-2xl border border-line bg-surface shadow-card lg:order-1 lg:col-span-8">
          <div className="border-b border-line-soft p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Pesquisar</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar por descrição ou categoria"
                  className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm"
                />
              </label>
              <select
                value={ordem}
                onChange={(e) => setOrdem(e.target.value as Ordem)}
                aria-label="Ordenar"
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-soft"
              >
                {ORDENS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </div>

            {temFiltro && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {categoria && (
                  <FiltroAtivo
                    rotulo={`${emojiDaCategoria(categoria)} ${nomeBonito(categoria)}`}
                    onLimpar={() => escolherCategoria(categoria)}
                  />
                )}
                {subcategoria && (
                  <FiltroAtivo rotulo={subcategoria} onLimpar={() => setSubcategoria(null)} />
                )}
                {dia && <FiltroAtivo rotulo={formatDate(dia)} onLimpar={() => setDia(null)} />}
                {termo && <FiltroAtivo rotulo={`"${busca.trim()}"`} onLimpar={() => setBusca('')} />}
                <button
                  type="button"
                  onClick={limparFiltros}
                  className="px-1 text-xs font-medium text-ink-muted hover:text-ink"
                >
                  Limpar tudo
                </button>
                <span className="ml-auto text-xs text-ink-muted">
                  {lista.length} lanç. ·{' '}
                  <b className="font-semibold text-ink">{formatCurrency(totalDaLista)}</b>
                </span>
              </div>
            )}
          </div>

          {carregando ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-2/70" />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <div className="p-3">
              <EmptyState
                icon={Receipt}
                title="Nenhuma despesa aqui"
                description={
                  temFiltro
                    ? 'Tente limpar os filtros ou mudar de mês.'
                    : 'Use o botão Nova despesa para lançar a primeira deste mês.'
                }
              />
            </div>
          ) : grupos ? (
            <div>
              {grupos.map((g) => (
                <div key={g.data}>
                  <div className="flex items-baseline justify-between gap-3 bg-surface-2/50 px-4 py-1.5">
                    <h3 className="min-w-0 truncate text-xs font-medium text-ink-muted first-letter:uppercase">
                      {tituloDoDia(g.data, hoje)}
                    </h3>
                    <span className="shrink-0 text-xs font-semibold text-ink-soft">
                      {formatCurrency(g.total)}
                    </span>
                  </div>
                  <ul className="divide-y divide-line-soft">
                    {g.despesas.map((d) => (
                      <LinhaDespesa
                        key={d.id}
                        despesa={d}
                        tipo={tipoDe(d)}
                        mostrarData={false}
                        onEditar={() => setDespesaEditando(d)}
                        onExcluir={() => handleExcluir(d)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {visiveis.map((d) => (
                <LinhaDespesa
                  key={d.id}
                  despesa={d}
                  tipo={tipoDe(d)}
                  mostrarData
                  onEditar={() => setDespesaEditando(d)}
                  onExcluir={() => handleExcluir(d)}
                />
              ))}
            </ul>
          )}

          {lista.length > limite && (
            <div className="border-t border-line-soft p-2">
              <button
                type="button"
                onClick={() => setLimiteSalvo({ assinatura, quantos: limite + LANCAMENTOS_POR_VEZ })}
                className="w-full rounded-xl py-2 text-sm font-semibold text-brand hover:bg-brand-soft"
              >
                Mostrar mais ({lista.length - limite} restantes)
              </button>
            </div>
          )}
        </section>

        {/* no celular, as categorias vêm antes da lista e o gráfico da semana depois */}
        <aside className="contents lg:order-2 lg:col-span-4 lg:block lg:space-y-4">
          <section className="order-1 min-w-0 rounded-2xl border border-line bg-surface p-3 shadow-card">
            <h3 className="px-2.5 pb-1 pt-1 text-sm font-semibold text-ink">Onde foi o dinheiro</h3>
            {categorias.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-sm text-ink-faint">Sem gastos neste período.</p>
            ) : (
              <>
                <div className="space-y-0.5">
                  {categorias.map((c, i) => (
                    <div
                      key={c.nome}
                      className={categoriasVisiveis.includes(c) || i < CATEGORIAS_FECHADAS ? '' : 'hidden lg:block'}
                    >
                      <BarraRanking
                        linha={c}
                        emoji={emojiDaCategoria(c.nome)}
                        ativa={categoria === c.nome}
                        onClick={() => escolherCategoria(c.nome)}
                      />
                      {categoria === c.nome && subcategorias.length > 1 && (
                        <div className="my-1 ml-3 space-y-0.5 border-l border-line-soft pl-2">
                          {subcategorias.map((s) => (
                            <BarraRanking
                              key={s.nome}
                              linha={s}
                              ativa={subcategoria === s.nome}
                              onClick={() => {
                                setSubcategoria((atual) => (atual === s.nome ? null : s.nome))
                                setDia(null)
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {categorias.length > CATEGORIAS_FECHADAS && (
                  <button
                    type="button"
                    onClick={() => setCategoriasAbertas((v) => !v)}
                    className="mt-1 w-full rounded-xl py-1.5 text-xs font-semibold text-brand hover:bg-brand-soft lg:hidden"
                  >
                    {categoriasAbertas ? 'Ver menos' : `Ver todas (${categorias.length})`}
                  </button>
                )}
                {resumo.comparacao && (
                  <p className="px-2.5 pt-1.5 text-[11px] text-ink-faint">
                    Setas comparam com {resumo.comparacao.rotulo}.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="order-3 min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <h3 className="text-sm font-semibold text-ink">Gasto médio por dia da semana</h3>
            <p className="mb-2 mt-0.5 text-xs text-ink-faint">Lazer e Alimentação, todo o histórico</p>
            <GastoPorDiaSemanaChart despesas={despesas} />
          </section>
        </aside>
      </div>

      {despesaEditando && (
        <DespesaFormModal
          despesa={despesaEditando}
          onClose={() => setDespesaEditando(undefined)}
          onSubmit={(dados: NovaDespesa) => atualizar(despesaEditando.id, dados)}
        />
      )}
    </>
  )
}
