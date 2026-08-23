import { useMemo, useState } from 'react'
import { Plus, PiggyBank, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { OrcamentoFormModal } from '@/components/orcamentos/OrcamentoFormModal'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { useDespesas } from '@/hooks/useDespesas'
import { formatCurrency } from '@/lib/format'
import { calcularStatus, CORES_STATUS } from '@/lib/statusOrcamento'
import type { Orcamento } from '@/types/finance'
import type { NovoOrcamento } from '@/repositories/orcamentosRepository'

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

export function Orcamentos() {
  const { orcamentos, carregando, erro, criar, atualizar, excluir } = useOrcamentos()
  const { despesas } = useDespesas()

  const [periodo, setPeriodo] = useState(periodoAtual())
  const [modalAberto, setModalAberto] = useState(false)
  const [orcamentoEditando, setOrcamentoEditando] = useState<Orcamento | undefined>()

  const periodosDisponiveis = useMemo(() => {
    const conjunto = new Set(despesas.map((d) => d.data.slice(0, 7)))
    conjunto.add(periodoAtual())
    return Array.from(conjunto).sort().reverse()
  }, [despesas])

  const categorias = useMemo(
    () => Array.from(new Set(despesas.map((d) => d.categoria))).sort(),
    [despesas]
  )
  const subcategorias = useMemo(
    () => Array.from(new Set(despesas.map((d) => d.subcategoria))).sort(),
    [despesas]
  )

  const despesasDoPeriodo = useMemo(
    () => despesas.filter((d) => d.data.slice(0, 7) === periodo),
    [despesas, periodo]
  )

  function realizadoDoOrcamento(orcamento: Orcamento): number {
    return despesasDoPeriodo
      .filter((d) => {
        if (d.categoria !== orcamento.categoria) return false
        if (orcamento.subcategoria) return d.subcategoria === orcamento.subcategoria
        return true
      })
      .reduce((soma, d) => soma + d.valor, 0)
  }

  const resumo = useMemo(() => {
    let orcado = 0
    let realizado = 0
    for (const o of orcamentos) {
      orcado += o.valorOrcado
      realizado += realizadoDoOrcamento(o)
    }
    return { orcado, realizado, disponivel: orcado - realizado }
  }, [orcamentos, despesasDoPeriodo])

  function abrirNovo() {
    setOrcamentoEditando(undefined)
    setModalAberto(true)
  }

  function abrirEdicao(orcamento: Orcamento) {
    setOrcamentoEditando(orcamento)
    setModalAberto(true)
  }

  async function handleSubmit(dados: NovoOrcamento) {
    if (orcamentoEditando) {
      await atualizar(orcamentoEditando.id, dados)
    } else {
      await criar(dados)
    }
  }

  async function handleExcluir(orcamento: Orcamento) {
    const label = orcamento.subcategoria
      ? `${orcamento.categoria} / ${orcamento.subcategoria}`
      : orcamento.categoria
    if (!confirm(`Excluir orçamento de "${label}"?`)) return
    await excluir(orcamento.id)
  }

  return (
    <>
      <PageHeader
        title="Orçamentos"
        subtitle={`Orçado: ${formatCurrency(resumo.orcado)} · Realizado: ${formatCurrency(
          resumo.realizado
        )} · Disponível: ${formatCurrency(resumo.disponivel)}`}
        action={
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10"
          >
            <Plus className="h-4 w-4" />
            Novo orçamento
          </button>
        }
      />

      <div className="mb-4">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-sm shadow-slate-900/[0.02]"
        >
          {periodosDisponiveis.map((p) => (
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
          Carregando orçamentos...
        </div>
      ) : orcamentos.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Nenhum orçamento cadastrado"
          description="Defina limites de gasto por categoria (ex.: Alimentação R$700/mês) para acompanhar o quanto ainda pode gastar."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {orcamentos.map((o) => {
            const realizado = realizadoDoOrcamento(o)
            const percentual = o.valorOrcado > 0 ? (realizado / o.valorOrcado) * 100 : 0
            const status = calcularStatus(percentual)
            const cores = CORES_STATUS[status]
            const disponivel = o.valorOrcado - realizado

            return (
              <div key={o.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.02]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-ink">{o.categoria}</p>
                    {o.subcategoria && <p className="text-xs text-ink-muted">{o.subcategoria}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Editar"
                      onClick={() => abrirEdicao(o)}
                      className="p-1.5 text-ink-muted hover:text-brand"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Excluir"
                      onClick={() => handleExcluir(o)}
                      className="p-1.5 text-ink-muted hover:text-expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-lg font-semibold text-ink">
                    {formatCurrency(realizado)}
                  </span>
                  <span className="text-xs text-ink-muted">de {formatCurrency(o.valorOrcado)}</span>
                </div>

                <div className="h-2 rounded-full bg-surface-2 mt-2 overflow-hidden">
                  <div
                    className={`h-full ${cores.barra}`}
                    style={{ width: `${Math.min(percentual, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs font-medium ${cores.texto}`}>
                    {percentual.toFixed(0)}% usado
                  </span>
                  <span className="text-xs text-ink-muted">
                    {disponivel >= 0
                      ? `${formatCurrency(disponivel)} disponível`
                      : `${formatCurrency(-disponivel)} acima`}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <OrcamentoFormModal
          orcamento={orcamentoEditando}
          categorias={categorias}
          subcategorias={subcategorias}
          onClose={() => setModalAberto(false)}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
