import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { SeletorCategoria } from '@/components/shared/SeletorCategoria'
import { SeletorSubcategoria } from '@/components/shared/SeletorSubcategoria'
import type { Despesa } from '@/types/finance'
import type { NovaDespesa } from '@/repositories/despesasRepository'

interface DespesaFormModalProps {
  despesa?: Despesa
  onClose: () => void
  onSubmit: (dados: NovaDespesa) => Promise<void>
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

export function DespesaFormModal({ despesa, onClose, onSubmit }: DespesaFormModalProps) {
  const [data, setData] = useState(despesa?.data ?? hoje())
  const [descricao, setDescricao] = useState(despesa?.descricao ?? '')
  const [valor, setValor] = useState(despesa ? String(despesa.valor) : '')
  const [categoria, setCategoria] = useState(despesa?.categoria ?? '')
  const [subcategoria, setSubcategoria] = useState(despesa?.subcategoria ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const valorNumerico = Number(valor.replace(',', '.'))

    if (!data || !descricao.trim() || !categoria.trim() || !subcategoria.trim() || !valorNumerico) {
      setErro('Preencha todos os campos com um valor válido.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await onSubmit({
        data,
        descricao: descricao.trim(),
        valor: valorNumerico,
        categoria: categoria.trim(),
        subcategoria: subcategoria.trim(),
      })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar despesa')
      setSalvando(false)
    }
  }

  return (
    <Modal title={despesa ? 'Editar despesa' : 'Nova despesa'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
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

        <SeletorCategoria
          value={categoria}
          onChange={(nome) => {
            setCategoria(nome)
            setSubcategoria('')
          }}
        />

        <SeletorSubcategoria
          value={subcategoria}
          onChange={setSubcategoria}
          nomeCategoria={categoria}
        />

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
