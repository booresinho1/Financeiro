import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Conta, TipoConta } from '@/types/finance'
import type { NovaConta } from '@/repositories/contasRepository'
import { hojeIso } from '@/lib/datas'

interface ContaFormModalProps {
  conta?: Conta
  onClose: () => void
  onSubmit: (dados: NovaConta) => Promise<void>
}

export function ContaFormModal({ conta, onClose, onSubmit }: ContaFormModalProps) {
  const [nome, setNome] = useState(conta?.nome ?? '')
  const [tipo, setTipo] = useState<TipoConta>(conta?.tipo ?? 'MANUAL')
  const [saldoInicial, setSaldoInicial] = useState(conta ? String(conta.saldoInicial) : '0')
  const [dataSaldoInicial, setDataSaldoInicial] = useState(conta?.dataSaldoInicial ?? '')
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
        dataSaldoInicial: dataSaldoInicial || undefined,
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
            <option value="MANUAL">Manual</option>
            <option value="AUTOMATICA">Automática</option>
          </select>
          <p className="text-xs text-ink-faint mt-1">
            {tipo === 'AUTOMATICA'
              ? 'O saldo é calculado sozinho: soma todas as entradas recebidas e subtrai todas as despesas. Use para sua conta principal do dia a dia.'
              : 'O saldo só muda quando você registra uma movimentação manual (em Contas). Entradas e despesas não afetam esse saldo. Use para reservas e metas.'}
          </p>
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

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Valer a partir de <span className="text-ink-faint font-normal">(opcional)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={dataSaldoInicial}
              onChange={(e) => setDataSaldoInicial(e.target.value)}
              className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-sm"
            />
            <button
              type="button"
              onClick={() => setDataSaldoInicial(hojeIso())}
              className="shrink-0 rounded-xl border border-line px-3.5 text-sm font-medium text-ink-soft hover:bg-surface-2"
            >
              Hoje
            </button>
          </div>
          <p className="text-xs text-ink-faint mt-1">
            {dataSaldoInicial
              ? 'Lançamentos anteriores a essa data são ignorados no cálculo do saldo — é como zerar o histórico e recomeçar a contar a partir do valor acima.'
              : 'Deixe em branco pra manter o comportamento padrão: soma tudo desde o começo.'}
          </p>
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
