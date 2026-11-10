import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CreditCard, ChevronDown, Ban, Check, Pencil, Trash2, ArrowUpRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { DividaFormModal } from '@/components/dividas/DividaFormModal'
import { RegistrarPagamentoModal } from '@/components/dividas/RegistrarPagamentoModal'
import { LinhaDoTempoParcelas, ResumoParcelas } from '@/components/dividas/PainelParcelamentos'
import { LinhaParcelamento } from '@/components/dividas/LinhaParcelamento'
import { useDividas } from '@/hooks/useDividas'
import { useParcelas } from '@/hooks/useParcelas'
import { useDespesas } from '@/hooks/useDespesas'
import { useEntradas } from '@/hooks/useEntradas'
import { useCartoes } from '@/hooks/useCartoes'
import { useAuth } from '@/contexts/AuthContext'
import { EMAIL_MASTER } from '@/lib/navigation'
import { useChartColors } from '@/lib/chartTheme'
import { criarDividaComParcelas } from '@/lib/criarDividaComParcelas'
import { statusEfetivoParcela } from '@/lib/dividaResumo'
import { montarParcelamentos } from '@/lib/parcelamentos'
import { formatCurrency, formatDate } from '@/lib/format'
import { hojeIso, somarMeses } from '@/lib/datas'
import type { Divida, Parcela } from '@/types/finance'
import type { NovaDivida } from '@/repositories/dividasRepository'

const STATUS_COR: Record<string, string> = {
  PAGA: 'bg-income-soft text-income',
  PENDENTE: 'bg-surface-2 text-ink-soft',
  ATRASADA: 'bg-expense-soft text-expense',
  CANCELADA: 'bg-surface-2 text-ink-faint line-through',
}

const ROTULO_STATUS: Record<string, string> = {
  PAGA: 'Paga',
  PENDENTE: 'A pagar',
  ATRASADA: 'Atrasada',
  CANCELADA: 'Cancelada',
}

export function Dividas() {
  const { user } = useAuth()
  const temBanco = user?.email === EMAIL_MASTER
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
  const { despesas, criar: criarDespesa } = useDespesas()
  const { entradas } = useEntradas()
  const { cartoes } = useCartoes(temBanco)
  const cores = useChartColors()

  const [modalDividaAberto, setModalDividaAberto] = useState(false)
  const [dividaEditando, setDividaEditando] = useState<Divida | undefined>()
  const [aberto, setAberto] = useState<string | null>(null)
  const [verQuitadas, setVerQuitadas] = useState(false)
  const [parcelaPagando, setParcelaPagando] = useState<Parcela | null>(null)

  const hoje = hojeIso()
  const resumo = useMemo(
    () => montarParcelamentos(dividas, parcelas, cartoes, hoje),
    [dividas, parcelas, cartoes, hoje]
  )

  // a cor segue o parcelamento; depois das 5 primeiras, todas em cinza
  const corDe = useMemo(() => {
    const mapa: Record<string, string> = {}
    resumo.itens.forEach((i, k) => {
      mapa[i.id] = k < cores.composicao.length ? cores.composicao[k] : cores.inkMuted
    })
    return mapa
  }, [resumo.itens, cores])

  // média do que entrou nos 3 meses fechados antes deste: base para o "peso na receita"
  const receitaMensal = useMemo(() => {
    const mes = hoje.slice(0, 7)
    const meses = [1, 2, 3].map((k) => somarMeses(`${mes}-01`, -k).slice(0, 7))
    const soma = entradas
      .filter((e) => e.status === 'RECEBIDA' && meses.includes(e.data.slice(0, 7)))
      .reduce((s, e) => s + e.valor, 0)
    return soma / 3
  }, [entradas, hoje])

  const encerradas = dividas.filter((d) => !resumo.itens.some((i) => i.idDivida === d.id))

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

    try {
      for (const parcela of parcelasDaDivida) {
        await excluirParcela(parcela.id)
      }
      await excluir(divida.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao excluir dívida')
    }
  }

  async function handleCancelarParcela(parcela: Parcela) {
    if (!confirm(`Cancelar a parcela ${parcela.numeroParcela}?`)) return
    await atualizarParcela(parcela.id, { ...parcela, status: 'CANCELADA' })
  }

  async function handleConfirmarPagamento(dados: Parameters<typeof atualizarParcela>[1]) {
    if (!parcelaPagando) return

    let idDespesa = dados.idDespesa
    if (!idDespesa) {
      const divida = dividas.find((d) => d.id === parcelaPagando.idDivida)
      const despesaCriada = await criarDespesa({
        data: dados.dataPagamento ?? parcelaPagando.dataVencimento,
        descricao: divida
          ? `Parcela ${parcelaPagando.numeroParcela}/${divida.numParcelas} - ${divida.descricao}`
          : `Parcela ${parcelaPagando.numeroParcela}`,
        valor: dados.valorPago ?? parcelaPagando.valorPrevisto,
        categoria: divida?.categoria || 'DÍVIDAS/FIXOS',
        subcategoria: divida?.subcategoria || 'Parcelas',
      })
      idDespesa = despesaCriada.id
    }

    await atualizarParcela(parcelaPagando.id, { ...dados, idDespesa })
  }

  function parcelasDaDivida(divida: Divida) {
    const lista = parcelas
      .filter((p) => p.idDivida === divida.id)
      .sort((a, b) => a.numeroParcela - b.numeroParcela)
    return (
      <>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-muted">
            {formatCurrency(divida.valorTotal)} em {divida.numParcelas}x · clique em{' '}
            <Check className="inline h-3.5 w-3.5 text-brand" /> quando pagar: a despesa é lançada sozinha
          </p>
          <span className="flex items-center gap-3">
            <button
              onClick={() => abrirEdicaoDivida(divida)}
              className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              onClick={() => handleExcluirDivida(divida)}
              className="flex items-center gap-1 text-xs font-semibold text-expense"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </button>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {lista.map((p) => {
            const status = statusEfetivoParcela(p)
            const aPagar = p.status === 'PENDENTE'
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                  status === 'ATRASADA' ? 'border-expense/40' : 'border-line-soft'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {p.numeroParcela}/{divida.numParcelas}
                    <span className="ml-1.5 font-normal text-ink-muted">vence {formatDate(p.dataVencimento)}</span>
                  </p>
                  <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_COR[status]}`}>
                    {ROTULO_STATUS[status]}
                    {p.status === 'PAGA' && p.dataPagamento && ` em ${formatDate(p.dataPagamento).slice(0, 5)}`}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="font-bold text-ink tabular-nums">{formatCurrency(p.valorPago || p.valorPrevisto)}</span>
                  {aPagar && (
                    <>
                      <button
                        onClick={() => setParcelaPagando(p)}
                        className="flex items-center gap-1 rounded-lg bg-brand px-2 py-1 text-[11px] font-semibold text-white hover:bg-brand-hover"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Paguei
                      </button>
                      <button
                        aria-label="Cancelar parcela"
                        onClick={() => handleCancelarParcela(p)}
                        className="rounded p-1 text-ink-faint hover:bg-surface-2"
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
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Parcelas e dívidas"
        subtitle={
          temBanco
            ? 'As compras parceladas do cartão entram sozinhas; as de fora (carnê, boleto) você cadastra aqui'
            : 'Cadastre suas dívidas parceladas e marque cada parcela quando pagar'
        }
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
        <div className="mb-4 rounded-xl border border-expense/25 bg-expense-soft px-4 py-3 text-sm text-expense">{erro}</div>
      )}

      {carregando ? (
        <div className="rounded-2xl border border-line bg-surface py-16 text-center text-sm text-ink-muted">
          Carregando parcelas...
        </div>
      ) : resumo.itens.length === 0 && encerradas.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhuma parcela em aberto"
          description="Cadastre uma dívida parcelada (carnê, boleto, empréstimo) e o app gera todas as parcelas."
        />
      ) : (
        <div className="space-y-4">
          <ResumoParcelas resumo={resumo} cores={corDe} receitaMensal={receitaMensal} />
          <LinhaDoTempoParcelas resumo={resumo} cores={corDe} receitaMensal={receitaMensal} />

          {resumo.itens.length > 0 && (
            <section>
              <h3 className="mb-2.5 text-base font-bold tracking-tight text-ink">
                Parcelamentos em aberto <span className="font-semibold text-ink-faint">({resumo.itens.length})</span>
              </h3>
              <div className="space-y-2.5">
                {resumo.itens.map((item) => {
                  const divida = item.idDivida ? dividas.find((d) => d.id === item.idDivida) : undefined
                  return (
                    <LinhaParcelamento
                      key={item.id}
                      item={item}
                      cor={corDe[item.id]}
                      aberta={aberto === item.id}
                      onAlternar={() => setAberto(aberto === item.id ? null : item.id)}
                    >
                      {divida ? (
                        parcelasDaDivida(divida)
                      ) : (
                        <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                          <span>
                            Cobrada junto com a fatura do cartão e lida do banco automaticamente: não precisa lançar
                            nem marcar como paga.
                          </span>
                          <Link to="/cartao" className="flex items-center gap-0.5 font-semibold text-brand hover:underline">
                            Ver no Cartão
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                        </p>
                      )}
                    </LinhaParcelamento>
                  )
                })}
              </div>
            </section>
          )}

          {encerradas.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setVerQuitadas((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
              >
                Quitadas ou encerradas ({encerradas.length})
                <ChevronDown className={`h-4 w-4 transition-transform ${verQuitadas ? 'rotate-180' : ''}`} />
              </button>
              {verQuitadas && (
                <div className="mt-2.5 space-y-2">
                  {encerradas.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-line bg-surface p-4 opacity-80">
                      <p className="mb-2 text-sm font-bold text-ink">
                        {d.descricao} <span className="font-semibold text-income">· quitada</span>
                      </p>
                      {parcelasDaDivida(d)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {modalDividaAberto && (
        <DividaFormModal divida={dividaEditando} onClose={() => setModalDividaAberto(false)} onSubmit={handleSalvarDivida} />
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
