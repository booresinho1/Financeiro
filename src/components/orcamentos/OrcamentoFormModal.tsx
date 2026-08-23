import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ComboBox } from '@/components/ui/ComboBox'
import type { Orcamento } from '@/types/finance'
import type { NovoOrcamento } from '@/repositories/orcamentosRepository'

interface OrcamentoFormModalProps {
  orcamento?: Orcamento
  categorias: string[]
  subcategorias: string[]
  onClose: () => void
  onSubmit: (dados: NovoOrcamento) => Promise<void>
}

export function OrcamentoFormModal({
  orcamento,
  categorias,
  subcategorias,
  onClose,
  onSubmit,
}: OrcamentoFormModalProps) {
  const [categoria, setCategoria] = useState(orcamento?.categoria ?? '')
  const [subcategoria, setSubcategoria] = useState(orcamento?.subcategoria ?? '')
  const [valorOrcado, setValorOrcado] = useState(orcamento ? String(orcamento.valorOrcado) : '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const valorNumerico = Number(valorOrcado.replace(',', '.'))

    if (!categoria.trim() || !valorNumerico) {
      setErro('Informe a categoria e um valor de orçamento válido.')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await onSubmit({
        categoria: categoria.trim(),
        subcategoria: subcategoria.trim() || undefined,
        valorOrcado: valorNumerico,
        periodo: 'MENSAL',
      })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar orçamento')
      setSalvando(false)
    }
  }

  return (
    <Modal title={orcamento ? 'Editar orçamento' : 'Novo orçamento'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Categoria</label>
          <ComboBox value={categoria} onChange={setCategoria} opcoes={categorias} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Subcategoria <span className="text-ink-faint font-normal">(opcional)</span>
          </label>
          <ComboBox
            value={subcategoria}
            onChange={setSubcategoria}
            opcoes={subcategorias}
            placeholder="Deixe em branco para orçar a categoria inteira"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Valor do orçamento (R$/mês)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorOrcado}
            onChange={(e) => setValorOrcado(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            placeholder="0,00"
            required
          />
          <p className="text-xs text-ink-faint mt-1">Esse valor se repete todo mês.</p>
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
