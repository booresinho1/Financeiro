import { useMemo, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Despesa, Parcela } from '@/types/finance'
import type { NovaParcela } from '@/repositories/parcelasRepository'
import { formatCurrency, formatDate } from '@/lib/format'
import { hojeIso } from '@/lib/datas'

interface RegistrarPagamentoModalProps {
  parcela: Parcela
  despesas: Despesa[]
  onClose: () => void
  onSubmit: (dados: NovaParcela) => Promise<void>
}

export function RegistrarPagamentoModal({
  parcela,
  despesas,
  onClose,
  onSubmit,
}: RegistrarPagamentoModalProps) {
  const [dataPagamento, setDataPagamento] = useState(hojeIso())
  const [valorPago, setValorPago] = useState(String(parcela.valorPrevisto))
  const [idDespesa, setIdDespesa] = useState(parcela.idDespesa ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const despesasProximas = useMemo(() => {
    const mesVencimento = parcela.dataVencimento.slice(0, 7)
    return despesas
      .filter((d) => d.data.slice(0, 7) === mesVencimento)
      .sort((a, b) => Math.abs(a.valor - parcela.valorPrevisto) - Math.abs(b.valor - parcela.valorPrevisto))
  }, [despesas, parcela])

  const valorNumerico = Number(valorPago.replace(',', '.'))
  const diferenca = valorNumerico - parcela.valorPrevisto
  const temDiferenca = Math.abs(diferenca) >= 0.01

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!dataPagamento || !valorNumerico) {
      setErro('Informe a data e o valor pago.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await onSubmit({
        idDivida: parcela.idDivida,
        numeroParcela: parcela.numeroParcela,
        dataVencimento: parcela.dataVencimento,
        valorPrevisto: parcela.valorPrevisto,
        dataPagamento,
        valorPago: valorNumerico,
        status: 'PAGA',
        idDespesa: idDespesa || undefined,
        observacao: parcela.observacao,
      })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao registrar pagamento')
      setSalvando(false)
    }
  }

  return (
    <Modal title={`Pagar parcela ${parcela.numeroParcela}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Data do pagamento</label>
          <input
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Valor pago (R$) <span className="text-ink-faint font-normal">— previsto {formatCurrency(parcela.valorPrevisto)}</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorPago}
            onChange={(e) => setValorPago(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            required
          />
          {temDiferenca && (
            <p className="text-xs text-amber-700 mt-1">
              ⚠ Valor pago diferente do previsto — diferença de {diferenca > 0 ? '+' : ''}
              {formatCurrency(diferenca)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Conciliar com despesa <span className="text-ink-faint font-normal">(opcional)</span>
          </label>
          <select
            value={idDespesa}
            onChange={(e) => setIdDespesa(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          >
            <option value="">Nenhuma</option>
            {despesasProximas.map((d) => (
              <option key={d.id} value={d.id}>
                {formatDate(d.data)} · {d.descricao} · {formatCurrency(d.valor)}
              </option>
            ))}
          </select>
          {despesasProximas.length === 0 && (
            <p className="text-xs text-ink-faint mt-1">
              Nenhuma despesa encontrada no mês de vencimento pra conciliar.
            </p>
          )}
        </div>

        {erro && <p className="text-sm text-expense">{erro}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10 disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Confirmar pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
