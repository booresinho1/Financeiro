import { useMemo, useState } from 'react'
import { Plus, CreditCard, ChevronDown, Ban, Check, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DividaFormModal } from '@/components/dividas/DividaFormModal'
import { RegistrarPagamentoModal } from '@/components/dividas/RegistrarPagamentoModal'
import { EvolucaoDividasChart } from '@/components/dividas/EvolucaoDividasChart'
import { useDividas } from '@/hooks/useDividas'
import { useParcelas } from '@/hooks/useParcelas'
import { useDespesas } from '@/hooks/useDespesas'
import { criarDividaComParcelas } from '@/lib/criarDividaComParcelas'
import { calcularResumoDivida, statusEfetivoParcela } from '@/lib/dividaResumo'
import { formatCurrency, formatDate } from '@/lib/format'
import { somarMeses } from '@/lib/datas'
import type { Divida, Parcela } from '@/types/finance'
import type { NovaDivida } from '@/repositories/dividasRepository'

function periodoAtual(): string {
  return new Date().toISOString().slice(0, 7)
}

const STATUS_COR: Record<string, string> = {
  PAGA: 'bg-brand-soft text-brand',
  PENDENTE: 'bg-surface-2 text-ink-soft',
  ATRASADA: 'bg-expense-soft text-expense',
  CANCELADA: 'bg-surface-2 text-ink-faint line-through',
}

export function Dividas() {
  const {
    dividas,
    carregando,
    erro,
    excluir,
    atualizar: atualizarDivida,
    recarregar: recarregarDividas,
  } = useDividas()
  const {
    parcelas,
    atualizar: atualizarParcela,
    excluir: excluirParcela,
    recarregar: recarregarParcelas,
  } = useParcelas()
  const { despesas } = useDespesas()

  const [modalDividaAberto, setModalDividaAberto] = useState(false)
  const [dividaEditando, setDividaEditando] = useState<Divida | undefined>()
  const [dividaExpandida, setDividaExpandida] = useState<string | null>(null)
  const [parcelaPagando, setParcelaPagando] = useState<Parcela | null>(null)
  const [mesInicial, setMesInicial] = useState(periodoAtual())
  const [mesFinal, setMesFinal] = useState(somarMeses(`${periodoAtual()}-01`, 5).slice(0, 7))


  const resumoGeral = useMemo(() => {
    let totalRestante = 0
    for (const d of dividas) {
      totalRestante += calcularResumoDivida(d, parcelas).totalRestante
    }
    return { totalRestante }
  }, [dividas, parcelas])

  async function handleSalvarDivida(dados: NovaDivida) {
    if (dividaEditando) {
      await atualizarDivida(dividaEditando.id, dados)
    } else {
      await criarDividaComParcelas(dados)
      await Promise.all([recarregarDividas(), recarregarParcelas()])
    }
  }

  function abrirNovaDivida() {
    setDividaEditando(undefined)
    setModalDividaAberto(true)
  }

  function abrirEdicaoDivida(divida: Divida) {
    setDividaEditando(divida)
    setModalDividaAberto(true)
  }

  async function handleExcluirDivida(divida: Divida) {
    const parcelasDaDivida = parcelas.filter((p) => p.idDivida === divida.id)
    const aviso =
      parcelasDaDivida.length > 0
        ? `Excluir a dívida "${divida.descricao}"? As ${parcelasDaDivida.length} parcela(s) geradas também serão excluídas.`
        : `Excluir a dívida "${divida.descricao}"?`

    if (!confirm(aviso)) return

    await excluir(divida.id)
    for (const parcela of parcelasDaDivida) {
      await excluirParcela(parcela.id)
    }
  }

  async function handleCancelarParcela(parcela: Parcela) {
    if (!confirm(`Cancelar a parcela ${parcela.numeroParcela}?`)) return
    await atualizarParcela(parcela.id, { ...parcela, status: 'CANCELADA' })
  }

  async function handleConfirmarPagamento(dados: Parameters<typeof atualizarParcela>[1]) {
    if (!parcelaPagando) return
    await atualizarParcela(parcelaPagando.id, dados)
  }

  return (
    <>
      <PageHeader
        title="Dívidas"
        subtitle={`Total restante: ${formatCurrency(resumoGeral.totalRestante)}`}
        action={
          <button
            onClick={abrirNovaDivida}
            className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10"
          >
            <Plus className="h-4 w-4" />
            Nova dívida
          </button>
        }
      />

      {erro && (
        <div className="mb-4 rounded-xl border border-expense/25 bg-expense-soft px-4 py-3 text-sm text-expense">
          {erro}
        </div>
      )}

      {!carregando && dividas.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm shadow-slate-900/[0.02] mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Evolução do comprometimento mensal
            </span>
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
          <p className="text-xs text-ink-faint mb-2">Quanto vence em cada mês, somando todas as dívidas</p>
          <EvolucaoDividasChart parcelas={parcelas} mesInicial={mesInicial} mesFinal={mesFinal} />
        </div>
      )}

      {carregando ? (
        <div className="rounded-2xl border border-line bg-surface py-16 text-center text-sm text-ink-muted shadow-sm shadow-slate-900/[0.02]">
          Carregando dívidas...
        </div>
      ) : dividas.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhuma dívida cadastrada"
          description="Cadastre uma dívida parcelada e o app gera todas as parcelas automaticamente."
        />
      ) : (
        <div className="space-y-3">
          {dividas.map((divida) => {
            const resumo = calcularResumoDivida(divida, parcelas)
            const parcelasDaDivida = parcelas
              .filter((p) => p.idDivida === divida.id)
              .sort((a, b) => a.numeroParcela - b.numeroParcela)
            const expandida = dividaExpandida === divida.id
            const percentualPago =
              divida.valorTotal > 0 ? (resumo.totalPago / divida.valorTotal) * 100 : 0

            return (
              <div key={divida.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.02]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-ink">{divida.descricao}</p>
                    <p className="text-xs text-ink-muted">
                      {resumo.parcelasPagas}/{divida.numParcelas} parcelas pagas
                      {resumo.dataPrevistaTermino &&
                        ` · Término previsto: ${formatDate(resumo.dataPrevistaTermino)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => abrirEdicaoDivida(divida)}
                      className="flex items-center gap-1 text-xs font-medium text-ink-soft"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleExcluirDivida(divida)}
                      className="text-xs font-medium text-expense"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-lg font-semibold text-ink">
                    {formatCurrency(resumo.totalPago)}
                  </span>
                  <span className="text-xs text-ink-muted">
                    de {formatCurrency(divida.valorTotal)} · restam{' '}
                    {formatCurrency(resumo.totalRestante)}
                  </span>
                </div>

                <div className="h-2 rounded-full bg-surface-2 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${Math.min(percentualPago, 100)}%` }}
                  />
                </div>

                <button
                  onClick={() => setDividaExpandida(expandida ? null : divida.id)}
                  className="flex items-center gap-1 text-xs font-medium text-ink-soft mt-3"
                >
                  Ver parcelas
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${expandida ? 'rotate-180' : ''}`}
                  />
                </button>

                {expandida && (
                  <div className="mt-3 pt-3 border-t border-line-soft space-y-2">
                    {parcelasDaDivida.map((p) => {
                      const status = statusEfetivoParcela(p)
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between text-xs gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-ink-soft">
                              Parcela {p.numeroParcela}/{divida.numParcelas} ·{' '}
                              {formatDate(p.dataVencimento)}
                            </p>
                            <span
                              className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COR[status]}`}
                            >
                              {status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-medium text-ink-soft">
                              {formatCurrency(p.valorPago || p.valorPrevisto)}
                            </span>
                            {p.status === 'PENDENTE' && (
                              <>
                                <button
                                  aria-label="Marcar como paga"
                                  onClick={() => setParcelaPagando(p)}
                                  className="p-1 text-brand hover:bg-brand-soft rounded"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  aria-label="Cancelar parcela"
                                  onClick={() => handleCancelarParcela(p)}
                                  className="p-1 text-ink-faint hover:bg-surface-2 rounded"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalDividaAberto && (
        <DividaFormModal
          divida={dividaEditando}
          onClose={() => setModalDividaAberto(false)}
          onSubmit={handleSalvarDivida}
        />
      )}

      {parcelaPagando && (
        <RegistrarPagamentoModal
          parcela={parcelaPagando}
          despesas={despesas}
          onClose={() => setParcelaPagando(null)}
          onSubmit={handleConfirmarPagamento}
        />
      )}
    </>
  )
}
