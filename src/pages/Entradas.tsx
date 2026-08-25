import { useMemo, useState } from 'react'
import { Plus, ArrowDownToLine, Pencil, Trash2, ArrowUpDown, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { EntradaFormModal } from '@/components/entradas/EntradaFormModal'
import { ConfirmarRecebimentoModal } from '@/components/entradas/ConfirmarRecebimentoModal'
import { useEntradas } from '@/hooks/useEntradas'
import { useContas } from '@/hooks/useContas'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Entrada } from '@/types/finance'
import type { NovaEntrada } from '@/repositories/entradasRepository'

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

export function Entradas() {
  const { entradas, carregando, erro, criar, atualizar, excluir } = useEntradas()
  const { contas } = useContas()

  const [busca, setBusca] = useState('')
  const [periodo, setPeriodo] = useState('todos')
  const [ordenarPor, setOrdenarPor] = useState<OrdenarPor>('data')
  const [ordemAsc, setOrdemAsc] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)
  const [entradaEditando, setEntradaEditando] = useState<Entrada | undefined>()
  const [entradaConfirmando, setEntradaConfirmando] = useState<Entrada | null>(null)

  const periodos = useMemo(() => {
    const conjunto = new Set(entradas.map((e) => periodoDaData(e.data)))
    return Array.from(conjunto).sort().reverse()
  }, [entradas])

  const nomesContas = useMemo(() => {
    const dasContasCadastradas = contas.filter((c) => c.ativa).map((c) => c.nome)
    const dasEntradas = entradas.map((e) => e.contaDestino)
    return Array.from(new Set([...dasContasCadastradas, ...dasEntradas])).sort()
  }, [contas, entradas])

  const entradasFiltradas = useMemo(() => {
    let lista = entradas

    if (periodo !== 'todos') lista = lista.filter((e) => periodoDaData(e.data) === periodo)
    if (busca.trim()) {
      const termo = busca.trim().toLowerCase()
      lista = lista.filter((e) => e.descricao.toLowerCase().includes(termo))
    }

    return [...lista].sort((a, b) => {
      let comparacao = 0
      if (ordenarPor === 'valor') comparacao = a.valor - b.valor
      else comparacao = String(a[ordenarPor]).localeCompare(String(b[ordenarPor]))
      return ordemAsc ? comparacao : -comparacao
    })
  }, [entradas, periodo, busca, ordenarPor, ordemAsc])

  const total = useMemo(
    () => entradasFiltradas.reduce((soma, e) => soma + e.valor, 0),
    [entradasFiltradas]
  )
  const totalPrevisto = useMemo(
    () =>
      entradasFiltradas
        .filter((e) => e.status === 'PREVISTA')
        .reduce((soma, e) => soma + e.valor, 0),
    [entradasFiltradas]
  )

  function alternarOrdenacao(campo: OrdenarPor) {
    if (ordenarPor === campo) {
      setOrdemAsc((atual) => !atual)
    } else {
      setOrdenarPor(campo)
      setOrdemAsc(false)
    }
  }

  function abrirNovaEntrada() {
    setEntradaEditando(undefined)
    setModalAberto(true)
  }

  function abrirEdicao(entrada: Entrada) {
    setEntradaEditando(entrada)
    setModalAberto(true)
  }

  async function handleSubmit(dados: NovaEntrada) {
    if (entradaEditando) {
      await atualizar(entradaEditando.id, dados)
    } else {
      await criar(dados)
    }
  }

  async function handleExcluir(entrada: Entrada) {
    if (!confirm(`Excluir "${entrada.descricao}" (${formatCurrency(entrada.valor)})?`)) return
    await excluir(entrada.id)
  }

  async function handleConfirmarRecebimento(dados: NovaEntrada) {
    if (!entradaConfirmando) return
    await atualizar(entradaConfirmando.id, dados)
  }

  return (
    <>
      <PageHeader
        title="Entradas"
        subtitle={
          `${entradasFiltradas.length} lançamento(s) · Total: ${formatCurrency(total)}` +
          (totalPrevisto > 0 ? ` (${formatCurrency(totalPrevisto)} ainda previsto)` : '')
        }
        action={
          <button
            onClick={abrirNovaEntrada}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10"
          >
            <Plus className="h-4 w-4" />
            Nova entrada
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
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
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-sm shadow-slate-900/[0.02]"
        >
          <option value="todos">Todos os períodos</option>
          {periodos.map((p) => (
            <option key={p} value={p}>
              {labelPeriodo(p)}
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
          Carregando entradas...
        </div>
      ) : entradasFiltradas.length === 0 ? (
        <EmptyState
          icon={ArrowDownToLine}
          title="Nenhuma entrada encontrada"
          description="Ajuste os filtros ou registre um novo recebimento."
        />
      ) : (
        <>
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
                  <th className="px-4 py-3 font-medium">Conta destino</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {entradasFiltradas.map((e) => (
                  <tr key={e.id} className="border-b border-line-soft last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{formatDate(e.data)}</td>
                    <td className="px-4 py-3 text-ink">
                      <div className="flex items-center gap-2">
                        {e.descricao}
                        {e.status === 'PREVISTA' && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-warning-soft text-warning">
                            Prevista
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap font-medium ${
                        e.status === 'PREVISTA' ? 'text-ink-faint' : 'text-income'
                      }`}
                    >
                      +{formatCurrency(e.valor)}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{e.categoria}</td>
                    <td className="px-4 py-3 text-ink-soft">{e.contaDestino}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {e.status === 'PREVISTA' && (
                          <button
                            aria-label="Confirmar recebimento"
                            onClick={() => setEntradaConfirmando(e)}
                            className="p-1.5 text-income hover:bg-income-soft rounded"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          aria-label="Editar"
                          onClick={() => abrirEdicao(e)}
                          className="p-1.5 text-ink-muted hover:text-brand"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          aria-label="Excluir"
                          onClick={() => handleExcluir(e)}
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

          <div className="md:hidden space-y-2">
            {entradasFiltradas.map((e) => (
              <div key={e.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.02]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink truncate">{e.descricao}</p>
                      {e.status === 'PREVISTA' && (
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-warning-soft text-warning">
                          Prevista
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {formatDate(e.data)} · {e.categoria} · {e.contaDestino}
                    </p>
                  </div>
                  <p
                    className={`font-semibold shrink-0 ${
                      e.status === 'PREVISTA' ? 'text-ink-faint' : 'text-income'
                    }`}
                  >
                    +{formatCurrency(e.valor)}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line-soft">
                  {e.status === 'PREVISTA' && (
                    <button
                      onClick={() => setEntradaConfirmando(e)}
                      className="flex items-center gap-1 text-xs font-medium text-income"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Confirmar
                    </button>
                  )}
                  <button
                    onClick={() => abrirEdicao(e)}
                    className="flex items-center gap-1 text-xs font-medium text-ink-soft"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleExcluir(e)}
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
        <EntradaFormModal
          entrada={entradaEditando}
          contas={nomesContas.length ? nomesContas : ['Conta Total']}
          onClose={() => setModalAberto(false)}
          onSubmit={handleSubmit}
        />
      )}

      {entradaConfirmando && (
        <ConfirmarRecebimentoModal
          entrada={entradaConfirmando}
          onClose={() => setEntradaConfirmando(null)}
          onSubmit={handleConfirmarRecebimento}
        />
      )}
    </>
  )
}
