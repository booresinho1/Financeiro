import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ComboBox } from '@/components/ui/ComboBox'
import type { Entrada, StatusEntrada } from '@/types/finance'
import type { NovaEntrada } from '@/repositories/entradasRepository'

interface EntradaFormModalProps {
  entrada?: Entrada
  categorias: string[]
  contas: string[]
  onClose: () => void
  onSubmit: (dados: NovaEntrada) => Promise<void>
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

export function EntradaFormModal({
  entrada,
  categorias,
  contas,
  onClose,
  onSubmit,
}: EntradaFormModalProps) {
  const [data, setData] = useState(entrada?.data ?? hoje())
  const [valor, setValor] = useState(entrada ? String(entrada.valor) : '')
  const [descricao, setDescricao] = useState(entrada?.descricao ?? '')
  const [categoria, setCategoria] = useState(entrada?.categoria ?? '')
  const [contaDestino, setContaDestino] = useState(entrada?.contaDestino ?? 'Conta Total')
  const [status, setStatus] = useState<StatusEntrada>(entrada?.status ?? 'RECEBIDA')
  const [observacao, setObservacao] = useState(entrada?.observacao ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const valorNumerico = Number(valor.replace(',', '.'))

    if (!data || !descricao.trim() || !categoria.trim() || !contaDestino.trim() || !valorNumerico) {
      setErro('Preencha todos os campos obrigatórios com um valor válido.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await onSubmit({
        data,
        valor: valorNumerico,
        descricao: descricao.trim(),
        categoria: categoria.trim(),
        contaDestino: contaDestino.trim(),
        status,
        observacao: observacao.trim() || undefined,
      })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar entrada')
      setSalvando(false)
    }
  }

  return (
    <Modal title={entrada ? 'Editar entrada' : 'Nova entrada'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Situação</label>
          <div className="flex rounded-xl bg-surface-2 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setStatus('RECEBIDA')}
              className={`flex-1 rounded-lg py-1.5 transition-colors ${
                status === 'RECEBIDA' ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted'
              }`}
            >
              Já recebida
            </button>
            <button
              type="button"
              onClick={() => setStatus('PREVISTA')}
              className={`flex-1 rounded-lg py-1.5 transition-colors ${
                status === 'PREVISTA' ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted'
              }`}
            >
              Prevista
            </button>
          </div>
          <p className="text-xs text-ink-faint mt-1">
            {status === 'PREVISTA'
              ? 'Fica provisionada e não entra no saldo até você confirmar o recebimento.'
              : 'Já entra no saldo da conta de destino.'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            {status === 'PREVISTA' ? 'Data prevista' : 'Data'}
          </label>
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
            placeholder="Salário, freelance, quinzena..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Categoria</label>
          <ComboBox value={categoria} onChange={setCategoria} opcoes={categorias} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Conta de destino</label>
          <ComboBox value={contaDestino} onChange={setContaDestino} opcoes={contas} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Observação <span className="text-ink-faint font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
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
