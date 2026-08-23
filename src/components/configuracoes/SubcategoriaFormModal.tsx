import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Categoria, Subcategoria } from '@/types/finance'
import type { NovaSubcategoria } from '@/repositories/subcategoriasRepository'

interface SubcategoriaFormModalProps {
  subcategoria?: Subcategoria
  categorias: Categoria[]
  idCategoriaInicial?: string
  onClose: () => void
  onSubmit: (dados: NovaSubcategoria) => Promise<void>
}

export function SubcategoriaFormModal({
  subcategoria,
  categorias,
  idCategoriaInicial,
  onClose,
  onSubmit,
}: SubcategoriaFormModalProps) {
  const [idCategoria, setIdCategoria] = useState(
    subcategoria?.idCategoria ?? idCategoriaInicial ?? categorias[0]?.id ?? ''
  )
  const [nome, setNome] = useState(subcategoria?.nome ?? '')
  const [ativa, setAtiva] = useState(subcategoria?.ativa ?? true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !idCategoria) {
      setErro('Escolha a categoria e informe um nome.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await onSubmit({ idCategoria, nome: nome.trim(), ativa })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar subcategoria')
      setSalvando(false)
    }
  }

  return (
    <Modal title={subcategoria ? 'Editar subcategoria' : 'Nova subcategoria'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Categoria</label>
          <select
            value={idCategoria}
            onChange={(e) => setIdCategoria(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            required
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            autoFocus
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={ativa}
            onChange={(e) => setAtiva(e.target.checked)}
            className="rounded border-line"
          />
          Subcategoria ativa
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
