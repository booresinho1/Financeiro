import { useMemo, useState } from 'react'
import { Plus, Receipt, Pencil, Trash2, ArrowUpDown, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { DespesaFormModal } from '@/components/despesas/DespesaFormModal'
import { useDespesas } from '@/hooks/useDespesas'
import { formatCurrency, formatDate } from '@/lib/format'
import { baixarCsv } from '@/lib/exportCsv'
import type { Despesa } from '@/types/finance'
import type { NovaDespesa } from '@/repositories/despesasRepository'

type OrdenarPor = 'data' | 'valor' | 'descricao' | 'categoria'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function periodoDaData(data: string): string {
  return data.slice(0, 7)
}

function labelPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-')
  return `${MESES[Number(mes) - 1]}/${ano}`
}

export function Despesas() {
  const { despesas, carregando, erro, criar, atualizar, excluir } = useDespesas()

  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState('todos')
  const [categoria, setCategoria] = useState('todas')
  const [subcategoria, setSubcategoria] = useState('todas')
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('data')
  const [ordemAsc, setOrdemAsc] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [despesaEditando, setDespesaEditando] = useState<Despesa | undefined>()

  const periodos = useMemo(() => {
    const conjunto = new Set(despesas.map((d) => periodoDaData(d.data)))
    return Array.from(conjunto).sort().reverse()
  }, [despesas])

  const categorias = useMemo(
    () => Array.from(new Set(despesas.map((d) => d.categoria))).sort(),
    [despesas]
  )

  const subcategorias = useMemo(() => {
    const base = categoria === 'todas' ? despesas : despesas.filter((d) => d.categoria === categoria)
    return Array.from(new Set(base.map((d) => d.subcategoria))).sort()
  }, [despesas, categoria])

  const despesasFiltradas = useMemo(() => {
    let lista = despesas

    if (periodo !== 'todos') lista = lista.filter((d) => periodoDaData(d.data) === periodo)
    if (categoria !== 'todas') lista = lista.filter((d) => d.categoria === categoria)
    if (subcategoria !== 'todas') lista = lista.filter((d) => d.subcategoria === subcategoria)
    if (busca.trim()) {
      const termo = busca.trim().toLowerCase()
      lista = lista.filter((d) => d.descricao.toLowerCase().includes(termo))
    }

    const ordenada = [...lista].sort((a, b) => {
      let comparacao = 0
      if (ordenarPor === 'valor') comparacao = a.valor - b.valor
      else comparacao = String(a[ordenarPor]).localeCompare(String(b[ordenarPor]))
      return ordemAsc ? comparacao : -comparacao
    })

    return ordenada
  }, [despesas, periodo, categoria, subcategoria, busca, ordenarPor, ordemAsc])

  const total = useMemo(
    () => despesasFiltradas.reduce((soma, d) => soma + d.valor, 0),
    [despesasFiltradas]
  )

  function alternarOrdenacao(campo: OrdenarPor) {
    if (ordenarPor === campo) {
      setOrdemAsc((atual) => !atual)
    } else {
      setOrdenarPor(campo)
      setOrdemAsc(false)
    }
  }

  function abrirNovaDespesa() {
    setDespesaEditando(undefined)
    setModalAberto(true)
  }

  function abrirEdicao(despesa: Despesa) {
    setDespesaEditando(despesa)
    setModalAberto(true)
  }

  async function handleSubmit(dados: NovaDespesa) {
    if (despesaEditando) {
      await atualizar(despesaEditando.id, dados)
    } else {
      await criar(dados)
    }
  }

  async function handleExcluir(despesa: Despesa) {
    if (!confirm(`Excluir "${despesa.descricao}" (${formatCurrency(despesa.valor)})?`)) return
    await excluir(despesa.id)
  }

  function handleBaixarRelatorio() {
    const linhas = despesasFiltradas.map((d) => [
      formatDate(d.data),
      d.descricao,
      d.valor.toFixed(2).replace('.', ','),
      d.categoria,
      d.subcategoria,
    ])
    linhas.push(['', '', '', '', ''])
    linhas.push(['Total', '', total.toFixed(2).replace('.', ','), '', ''])

    const sufixoPeriodo = periodo === 'todos' ? 'todos-periodos' : periodo
    baixarCsv(
      `despesas-${sufixoPeriodo}.csv`,
      ['Data', 'Descrição', 'Valor', 'Categoria', 'Subcategoria'],
      linhas
    )
  }

  return (
    <>
      <PageHeader
        title="Despesas"
        subtitle={`${despesasFiltradas.length} lançamento(s) · Total: ${formatCurrency(total)}`}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleBaixarRelatorio}
              disabled={despesasFiltradas.length === 0}
              icon={<Download className="h-4 w-4" />}
            >
              Baixar relatório
            </Button>
            <Button onClick={abrirNovaDespesa} icon={<Plus className="h-4 w-4" />}>
              Nova despesa
            </Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <input
          type="text"
          placeholder="Pesquisar por descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-sm shadow-slate-900/[0.02]"
        />
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-soft shadow-sm shadow-slate-900/[0.02]"
        >
          <option value="todos">Todos os períodos</option>
          {periodos.map((p) => (
            <option key={p} value={p}>
              {labelPeriodo(p)}
            </option>
          ))}
        </select>
        <select
          value={categoria}
          onChange={(e) => {
            setCategoria(e.target.value)
            setSubcategoria('todas')
          }}
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-soft shadow-sm shadow-slate-900/[0.02]"
        >
          <option value="todas">Todas categorias</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={subcategoria}
          onChange={(e) => setSubcategoria(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink-soft shadow-sm shadow-slate-900/[0.02]"
        >
          <option value="todas">Todas subcategorias</option>
          {subcategorias.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {erro && (
        <div className="mb-4 rounded-xl border border-expense/25 bg-expense-soft px-4 py-3 text-sm text-expense">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="rounded-2xl border border-line bg-surface py-16 text-center text-sm text-ink-muted shadow-sm shadow-slate-900/[0.02]">
          Carregando despesas...
        </div>
      ) : despesasFiltradas.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma despesa encontrada"
          description="Ajuste os filtros ou crie um novo lançamento."
        />
      ) : (
        <>
          {/* Tabela — desktop/tablet */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm shadow-slate-900/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-soft text-left text-ink-faint">
                  {(
                    [
                      ['data', 'Data'],
                      ['descricao', 'Descrição'],
                      ['valor', 'Valor'],
                      ['categoria', 'Categoria'],
                    ] as [OrdenarPor, string][]
                  ).map(([campo, label]) => (
                    <th key={campo} className="px-4 py-3 font-medium">
                      <button
                        onClick={() => alternarOrdenacao(campo)}
                        className="flex items-center gap-1 hover:text-ink"
                      >
                        {label}
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Subcategoria</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {despesasFiltradas.map((d) => (
                  <tr key={d.id} className="border-b border-line-soft last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{formatDate(d.data)}</td>
                    <td className="px-4 py-3 text-ink">{d.descricao}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-ink">
                      {formatCurrency(d.valor)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{d.categoria}</td>
                    <td className="px-4 py-3 text-ink-soft">{d.subcategoria}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          aria-label="Editar"
                          onClick={() => abrirEdicao(d)}
                          className="p-1.5 text-ink-muted hover:text-brand"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Excluir"
                          onClick={() => handleExcluir(d)}
                          className="p-1.5 text-ink-muted hover:text-expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile */}
          <div className="md:hidden space-y-2">
            {despesasFiltradas.map((d) => (
              <div key={d.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{d.descricao}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {formatDate(d.data)} · {d.categoria} / {d.subcategoria}
                    </p>
                  </div>
                  <p className="font-semibold text-ink shrink-0">{formatCurrency(d.valor)}</p>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line-soft">
                  <button
                    onClick={() => abrirEdicao(d)}
                    className="flex items-center gap-1 text-xs font-medium text-ink-soft"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleExcluir(d)}
                    className="flex items-center gap-1 text-xs font-medium text-expense"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalAberto && (
        <DespesaFormModal
          despesa={despesaEditando}
          onClose={() => setModalAberto(false)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
