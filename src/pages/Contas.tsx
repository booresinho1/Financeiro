import { useMemo, useState } from 'react'
import { Plus, Wallet, ArrowRightLeft, Pencil, Trash2, ChevronDown, Target } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContaFormModal } from '@/components/contas/ContaFormModal'
import { MovimentacaoModal } from '@/components/contas/MovimentacaoModal'
import { MetaFormModal } from '@/components/contas/MetaFormModal'
import { useContas } from '@/hooks/useContas'
import { useMovimentacoes } from '@/hooks/useMovimentacoes'
import { useDespesas } from '@/hooks/useDespesas'
import { useEntradas } from '@/hooks/useEntradas'
import { useMetas } from '@/hooks/useMetas'
import { calcularSaldo, calcularTotalEmContas } from '@/lib/saldos'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Conta } from '@/types/finance'
import type { NovaConta } from '@/repositories/contasRepository'

export function Contas() {
  const { contas, carregando, erro, criar, atualizar, excluir } = useContas()
  const { movimentacoes, criar: criarMovimentacao, excluir: excluirMovimentacao } =
    useMovimentacoes()
  const { despesas } = useDespesas()
  const { entradas } = useEntradas()
  const { metas, salvar: salvarMeta } = useMetas()

  const [modalContaAberto, setModalContaAberto] = useState(false)
  const [contaEditando, setContaEditando] = useState<Conta | undefined>()
  const [modalMovAberto, setModalMovAberto] = useState(false)
  const [contaParaMov, setContaParaMov] = useState<string | undefined>()
  const [contaExpandida, setContaExpandida] = useState<string | null>(null)
  const [contaParaMeta, setContaParaMeta] = useState<Conta | undefined>()

  const dadosSaldo = { despesas, entradas, movimentacoes }

  const totalEmContas = useMemo(
    () => calcularTotalEmContas(contas, dadosSaldo),
    [contas, despesas, entradas, movimentacoes]
  )

  function extratoDaConta(nome: string) {
    return movimentacoes
      .filter((m) => m.conta === nome || m.contaOrigem === nome || m.contaDestino === nome)
      .sort((a, b) => b.data.localeCompare(a.data))
  }

  function abrirNovaConta() {
    setContaEditando(undefined)
    setModalContaAberto(true)
  }

  function abrirEdicaoConta(conta: Conta) {
    setContaEditando(conta)
    setModalContaAberto(true)
  }

  async function handleSubmitConta(dados: NovaConta) {
    if (contaEditando) {
      await atualizar(contaEditando.id, dados)
    } else {
      await criar(dados)
    }
  }

  async function handleExcluirConta(conta: Conta) {
    if (!confirm(`Excluir a conta "${conta.nome}"? Isso não apaga o histórico de movimentações.`))
      return
    await excluir(conta.id)
  }

  function abrirNovaMovimentacao(nomeConta?: string) {
    setContaParaMov(nomeConta)
    setModalMovAberto(true)
  }

  async function handleExcluirMovimentacao(id: string) {
    if (!confirm('Excluir esta movimentação?')) return
    await excluirMovimentacao(id)
  }

  async function handleSalvarMeta(valorMeta: number) {
    if (!contaParaMeta) return
    const metaExistente = metas.find((m) => m.idConta === contaParaMeta.id)
    await salvarMeta(contaParaMeta.id, valorMeta, metaExistente)
  }

  return (
    <>
      <PageHeader
        title="Contas"
        subtitle={`Total em contas: ${formatCurrency(totalEmContas)}`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => abrirNovaMovimentacao()}
              disabled={contas.length < 1}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-soft shadow-sm shadow-slate-900/[0.02] hover:bg-surface-2 disabled:opacity-50"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Movimentar
            </button>
            <button
              onClick={abrirNovaConta}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10"
            >
              <Plus className="h-4 w-4" />
              Nova conta
            </button>
          </div>
        }
      />

      {erro && (
        <div className="mb-4 rounded-xl border border-expense/25 bg-expense-soft px-4 py-3 text-sm text-expense">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="rounded-2xl border border-line bg-surface py-16 text-center text-sm text-ink-muted shadow-sm shadow-slate-900/[0.02]">
          Carregando contas...
        </div>
      ) : contas.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta cadastrada"
          description='Comece criando a "Conta Total" (automática) e, se quiser, uma conta manual como a Reserva de Emergência.'
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {contas.map((conta) => {
            const saldo = calcularSaldo(conta, dadosSaldo)
            const expandida = contaExpandida === conta.nome
            const extrato = extratoDaConta(conta.nome)
            const meta = metas.find((m) => m.idConta === conta.id)
            const percentualMeta = meta && meta.valorMeta > 0 ? (saldo / meta.valorMeta) * 100 : 0

            return (
              <div
                key={conta.id}
                className={`rounded-2xl border bg-surface p-4 shadow-sm shadow-slate-900/[0.02] ${
                  conta.ativa ? 'border-line' : 'border-line opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-ink">{conta.nome}</p>
                    <span
                      className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        conta.tipo === 'AUTOMATICA'
                          ? 'bg-brand-soft text-brand'
                          : 'bg-surface-2 text-ink-soft'
                      }`}
                    >
                      {conta.tipo === 'AUTOMATICA' ? 'Automática' : 'Manual'}
                      {!conta.ativa && ' · Inativa'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Editar"
                      onClick={() => abrirEdicaoConta(conta)}
                      className="p-1.5 text-ink-muted hover:text-brand"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      aria-label="Excluir"
                      onClick={() => handleExcluirConta(conta)}
                      className="p-1.5 text-ink-muted hover:text-expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-2xl font-semibold text-ink mt-3">
                  {formatCurrency(saldo)}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                  Saldo inicial: {formatCurrency(conta.saldoInicial)}
                </p>

                {conta.tipo === 'MANUAL' && (
                  <div className="mt-3">
                    {meta ? (
                      <>
                        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full bg-brand"
                            style={{ width: `${Math.min(percentualMeta, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs font-medium text-brand">
                            {percentualMeta.toFixed(0)}% da meta
                          </span>
                          <button
                            onClick={() => setContaParaMeta(conta)}
                            className="text-xs text-ink-muted hover:text-brand"
                          >
                            Meta: {formatCurrency(meta.valorMeta)}
                          </button>
                        </div>
                        <p className="text-xs text-ink-faint">
                          Faltam {formatCurrency(Math.max(meta.valorMeta - saldo, 0))}
                        </p>
                      </>
                    ) : (
                      <button
                        onClick={() => setContaParaMeta(conta)}
                        className="flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-brand"
                      >
                        <Target className="h-3.5 w-3.5" />
                        Definir meta
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line-soft">
                  <button
                    onClick={() => abrirNovaMovimentacao(conta.nome)}
                    className="text-xs font-medium text-brand"
                  >
                    + Movimentação
                  </button>
                  <button
                    onClick={() => setContaExpandida(expandida ? null : conta.nome)}
                    className="flex items-center gap-1 text-xs font-medium text-ink-soft ml-auto"
                  >
                    Extrato ({extrato.length})
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${expandida ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {expandida && (
                  <div className="mt-3 pt-3 border-t border-line-soft space-y-2 max-h-56 overflow-y-auto">
                    {extrato.length === 0 ? (
                      <p className="text-xs text-ink-faint">Nenhuma movimentação registrada.</p>
                    ) : (
                      extrato.map((m) => {
                        const entrada =
                          (m.tipo === 'ENTRADA' && m.conta === conta.nome) ||
                          (m.tipo === 'TRANSFERENCIA' && m.contaDestino === conta.nome)
                        return (
                          <div key={m.id} className="flex items-center justify-between text-xs">
                            <div className="min-w-0">
                              <p className="text-ink-soft truncate">{m.descricao}</p>
                              <p className="text-ink-faint">
                                {formatDate(m.data)}
                                {m.tipo === 'TRANSFERENCIA' &&
                                  ` · ${m.contaOrigem} → ${m.contaDestino}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={entrada ? 'text-brand font-medium' : 'text-expense font-medium'}
                              >
                                {entrada ? '+' : '-'}
                                {formatCurrency(m.valor)}
                              </span>
                              <button
                                aria-label="Excluir movimentação"
                                onClick={() => handleExcluirMovimentacao(m.id)}
                                className="text-ink-faint hover:text-expense"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalContaAberto && (
        <ContaFormModal
          conta={contaEditando}
          onClose={() => setModalContaAberto(false)}
          onSubmit={handleSubmitConta}
        />
      )}

      {modalMovAberto && (
        <MovimentacaoModal
          contas={contas.filter((c) => c.ativa)}
          contaInicial={contaParaMov}
          onClose={() => setModalMovAberto(false)}
          onSubmit={criarMovimentacao}
        />
      )}

      {contaParaMeta && (
        <MetaFormModal
          nomeConta={contaParaMeta.nome}
          valorAtual={metas.find((m) => m.idConta === contaParaMeta.id)?.valorMeta}
          onClose={() => setContaParaMeta(undefined)}
          onSubmit={handleSalvarMeta}
        />
      )}
    </>
  )
}
