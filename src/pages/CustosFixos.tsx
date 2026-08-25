import { useMemo, useState } from 'react'
import { Plus, Repeat, Pencil, Trash2, Check, AlertTriangle, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { CustoFixoFormModal } from '@/components/custosFixos/CustoFixoFormModal'
import { RegistrarPagamentoCustoFixoModal } from '@/components/custosFixos/RegistrarPagamentoCustoFixoModal'
import { useCustosFixos } from '@/hooks/useCustosFixos'
import { useDespesas } from '@/hooks/useDespesas'
import { usePagamentosCustosFixos } from '@/hooks/usePagamentosCustosFixos'
import { formatCurrency, formatDate } from '@/lib/format'
import { calcularProvisionamento } from '@/lib/provisionamento'
import type { CustoFixo } from '@/types/finance'
import type { NovoCustoFixo } from '@/repositories/custosFixosRepository'

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

export function CustosFixos() {
  const { custosFixos, carregando, erro, criar, atualizar, excluir } = useCustosFixos()
  const { despesas } = useDespesas()
  const { pagamentos, registrar: registrarPagamento, desmarcar: desmarcarPagamento } =
    usePagamentosCustosFixos()

  const [periodo, setPeriodo] = useState(periodoAtual())
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<CustoFixo | undefined>()
  const [pagando, setPagando] = useState<CustoFixo | undefined>()

  const periodosDisponiveis = useMemo(() => {
    const conjunto = new Set(despesas.map((d) => d.data.slice(0, 7)))
    conjunto.add(periodoAtual())
    return Array.from(conjunto).sort().reverse()
  }, [despesas])


  const despesasDoPeriodo = useMemo(
    () => despesas.filter((d) => d.data.slice(0, 7) === periodo),
    [despesas, periodo]
  )

  const custosAtivos = useMemo(
    () => custosFixos.filter((c) => c.ativo && c.dataInicio.slice(0, 7) <= periodo),
    [custosFixos, periodo]
  )

  function pagamentoDoPeriodo(custoFixoId: string) {
    return pagamentos.find((p) => p.idCustoFixo === custoFixoId && p.periodo === periodo)
  }

  const resumo = useMemo(() => {
    let previsto = 0
    let realizado = 0
    for (const c of custosAtivos) {
      previsto += c.valorPrevisto
      realizado += pagamentoDoPeriodo(c.id)?.valorPago ?? 0
    }
    return { previsto, realizado }
  }, [custosAtivos, pagamentos, periodo])

  function abrirNovo() {
    setEditando(undefined)
    setModalAberto(true)
  }

  function abrirEdicao(custoFixo: CustoFixo) {
    setEditando(custoFixo)
    setModalAberto(true)
  }

  async function handleSubmit(dados: NovoCustoFixo) {
    if (editando) {
      await atualizar(editando.id, dados)
    } else {
      await criar(dados)
    }
  }

  async function handleExcluir(custoFixo: CustoFixo) {
    if (!confirm(`Excluir o custo fixo "${custoFixo.descricao}"?`)) return
    await excluir(custoFixo.id)
  }

  async function handleDesmarcarPagamento(pagamentoId: string) {
    if (!confirm('Desmarcar este pagamento?')) return
    await desmarcarPagamento(pagamentoId)
  }

  return (
    <>
      <PageHeader
        title="Custos Fixos"
        subtitle={`Previsto: ${formatCurrency(resumo.previsto)} · Realizado: ${formatCurrency(
          resumo.realizado
        )}`}
        action={
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10"
          >
            <Plus className="h-4 w-4" />
            Novo custo fixo
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
          Carregando custos fixos...
        </div>
      ) : custosAtivos.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhum custo fixo ativo neste período"
          description="Cadastre compromissos recorrentes como aluguel, academia ou assinaturas."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {custosAtivos.map((c) => {
            const pagamento = pagamentoDoPeriodo(c.id)
            const sugestao = calcularProvisionamento(c, despesasDoPeriodo)

            return (
              <div key={c.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.02]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-ink">{c.descricao}</p>
                    <p className="text-xs text-ink-muted">
                      {c.categoria} / {c.subcategoria} · Vence dia {c.diaVencimento}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Editar"
                      onClick={() => abrirEdicao(c)}
                      className="p-1.5 text-ink-muted hover:text-brand"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Excluir"
                      onClick={() => handleExcluir(c)}
                      className="p-1.5 text-ink-muted hover:text-expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-lg font-semibold text-ink">
                    {formatCurrency(pagamento?.valorPago ?? 0)}
                  </span>
                  <span className="text-xs text-ink-muted">
                    previsto {formatCurrency(c.valorPrevisto)}
                  </span>
                </div>

                {pagamento ? (
                  <div className="flex items-center justify-between gap-1.5 mt-2 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-brand-soft text-brand">
                    <span className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      Pago em {formatDate(pagamento.dataPagamento)}
                    </span>
                    <button
                      aria-label="Desmarcar pagamento"
                      onClick={() => handleDesmarcarPagamento(pagamento.id)}
                      className="text-brand hover:text-brand-hover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setPagando(c)}
                      className="w-full mt-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover"
                    >
                      Marcar como pago
                    </button>
                    {sugestao.despesaVinculada && (
                      <p className="flex items-center gap-1 text-[11px] text-ink-faint mt-1.5">
                        <AlertTriangle className="h-3 w-3" />
                        Despesa parecida encontrada: {sugestao.despesaVinculada.descricao} (
                        {formatCurrency(sugestao.despesaVinculada.valor)})
                      </p>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <CustoFixoFormModal
          custoFixo={editando}
          onClose={() => setModalAberto(false)}
          onSubmit={handleSubmit}
        />
      )}

      {pagando && (
        <RegistrarPagamentoCustoFixoModal
          custoFixo={pagando}
          periodo={periodo}
          despesasDoPeriodo={despesasDoPeriodo}
          despesaSugerida={calcularProvisionamento(pagando, despesasDoPeriodo).despesaVinculada}
          onClose={() => setPagando(undefined)}
          onSubmit={registrarPagamento}
        />
      )}
    </>
  )
}
