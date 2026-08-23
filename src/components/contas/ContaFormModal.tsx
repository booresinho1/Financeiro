import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Conta, TipoConta } from '@/types/finance'
import type { NovaConta } from '@/repositories/contasRepository'

interface ContaFormModalProps {
  conta?: Conta
  onClose: () => void
  onSubmit: (dados: NovaConta) => Promise<void>
}

export function ContaFormModal({ conta, onClose, onSubmit }: ContaFormModalProps) {
  const [nome, setNome] = useState(conta?.nome ?? '')
  const [tipo, setTipo] = useState<TipoConta>(conta?.tipo ?? 'MANUAL')
  const [saldoInicial, setSaldoInicial] = useState(conta ? String(conta.saldoInicial) : '0')
  const [ativa, setAtiva] = useState(conta?.ativa ?? true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!nome.trim()) {
      setErro('Informe um nome para a conta.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await onSubmit({
        nome: nome.trim(),
        tipo,
        saldoInicial: Number(saldoInicial.replace(',', '.')) || 0,
        ativa,
      })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar conta')
      setSalvando(false)
    }
  }

  return (
    <Modal title={conta ? 'Editar conta' : 'Nova conta'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            placeholder="Reserva de Emergência, Conta Total..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoConta)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          >
            <option value="MANUAL">Manual (só muda por movimentação)</option>
            <option value="AUTOMATICA">Automática (soma entradas e despesas do Sheets)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Saldo inicial (R$)</label>
          <input
            type="number"
            step="0.01"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={ativa}
            onChange={(e) => setAtiva(e.target.checked)}
            className="rounded border-line"
          />
          Conta ativa
        </label>

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
