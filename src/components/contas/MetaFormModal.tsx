import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'

interface MetaFormModalProps {
  nomeConta: string
  valorAtual?: number
  onClose: () => void
  onSubmit: (valorMeta: number) => Promise<void>
}

export function MetaFormModal({ nomeConta, valorAtual, onClose, onSubmit }: MetaFormModalProps) {
  const [valorMeta, setValorMeta] = useState(valorAtual ? String(valorAtual) : '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const valor = Number(valorMeta.replace(',', '.'))

    if (!valor) {
      setErro('Informe um valor de meta válido.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await onSubmit(valor)
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar meta')
      setSalvando(false)
    }
  }

  return (
    <Modal title={`Meta de "${nomeConta}"`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Valor da meta (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorMeta}
            onChange={(e) => setValorMeta(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            placeholder="10000,00"
            autoFocus
            required
          />
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
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
