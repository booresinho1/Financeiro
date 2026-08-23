import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Entrada } from '@/types/finance'
import type { NovaEntrada } from '@/repositories/entradasRepository'
import { formatCurrency } from '@/lib/format'
import { hojeIso } from '@/lib/datas'

interface ConfirmarRecebimentoModalProps {
  entrada: Entrada
  onClose: () => void
  onSubmit: (dados: NovaEntrada) => Promise<void>
}

export function ConfirmarRecebimentoModal({
  entrada,
  onClose,
  onSubmit,
}: ConfirmarRecebimentoModalProps) {
  const [dataRecebimento, setDataRecebimento] = useState(hojeIso())
  const [valorRecebido, setValorRecebido] = useState(String(entrada.valor))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const valorNumerico = Number(valorRecebido.replace(',', '.'))
  const diferenca = valorNumerico - entrada.valor
  const temDiferenca = Math.abs(diferenca) >= 0.01

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!dataRecebimento || !valorNumerico) {
      setErro('Informe a data e o valor recebido.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await onSubmit({
        data: dataRecebimento,
        valor: valorNumerico,
        descricao: entrada.descricao,
        categoria: entrada.categoria,
        contaDestino: entrada.contaDestino,
        status: 'RECEBIDA',
        observacao: entrada.observacao,
      })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao confirmar recebimento')
      setSalvando(false)
    }
  }

  return (
    <Modal title={`Confirmar recebimento — ${entrada.descricao}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Data do recebimento</label>
          <input
            type="date"
            value={dataRecebimento}
            onChange={(e) => setDataRecebimento(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Valor recebido (R$) <span className="text-ink-faint font-normal">— previsto {formatCurrency(entrada.valor)}</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorRecebido}
            onChange={(e) => setValorRecebido(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            required
          />
          {temDiferenca && (
            <p className="text-xs text-warning mt-1">
              Valor recebido diferente do previsto — diferença de {diferenca > 0 ? '+' : ''}
              {formatCurrency(diferenca)}
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
            {salvando ? 'Salvando...' : 'Confirmar recebimento'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
