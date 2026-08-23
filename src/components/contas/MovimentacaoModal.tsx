import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Conta, TipoMovimentacao } from '@/types/finance'
import type { NovaMovimentacao } from '@/repositories/movimentacoesRepository'

interface MovimentacaoModalProps {
  contas: Conta[]
  contaInicial?: string
  onClose: () => void
  onSubmit: (dados: NovaMovimentacao) => Promise<void>
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

export function MovimentacaoModal({
  contas,
  contaInicial,
  onClose,
  onSubmit,
}: MovimentacaoModalProps) {
  const [tipo, setTipo] = useState<TipoMovimentacao>('TRANSFERENCIA')
  const [data, setData] = useState(hoje())
  const [valor, setValor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [conta, setConta] = useState(contaInicial ?? contas[0]?.nome ?? '')
  const [contaOrigem, setContaOrigem] = useState(contaInicial ?? contas[0]?.nome ?? '')
  const [contaDestino, setContaDestino] = useState(
    contas.find((c) => c.nome !== contaInicial)?.nome ?? ''
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const valorNumerico = Number(valor.replace(',', '.'))

    if (!data || !descricao.trim() || !valorNumerico) {
      setErro('Preencha todos os campos com um valor válido.')
      return
    }

    if (tipo === 'TRANSFERENCIA' && contaOrigem === contaDestino) {
      setErro('Conta de origem e destino devem ser diferentes.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      if (tipo === 'TRANSFERENCIA') {
        await onSubmit({
          data,
          tipo,
          valor: valorNumerico,
          descricao: descricao.trim(),
          conta: contaOrigem,
          contaOrigem,
          contaDestino,
        })
      } else {
        await onSubmit({
          data,
          tipo,
          valor: valorNumerico,
          descricao: descricao.trim(),
          conta,
        })
      }
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar movimentação')
      setSalvando(false)
    }
  }

  return (
    <Modal title="Nova movimentação" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoMovimentacao)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
          >
            <option value="TRANSFERENCIA">Transferência entre contas</option>
            <option value="ENTRADA">Entrada manual (aporte)</option>
            <option value="RETIRADA">Retirada</option>
          </select>
        </div>

        {tipo === 'TRANSFERENCIA' ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1">De</label>
              <select
                value={contaOrigem}
                onChange={(e) => setContaOrigem(e.target.value)}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
              >
                {contas.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1">Para</label>
              <select
                value={contaDestino}
                onChange={(e) => setContaDestino(e.target.value)}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
              >
                {contas.map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Conta</label>
            <select
              value={conta}
              onChange={(e) => setConta(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            >
              {contas.map((c) => (
                <option key={c.id} value={c.nome}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            placeholder="0,00"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
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
