import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import type { Categoria } from '@/types/finance'
import type { NovaCategoria } from '@/repositories/categoriasRepository'

interface CategoriaFormModalProps {
  categoria?: Categoria
  onClose: () => void
  onSubmit: (dados: NovaCategoria) => Promise<void>
}

export function CategoriaFormModal({ categoria, onClose, onSubmit }: CategoriaFormModalProps) {
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [ativa, setAtiva] = useState(categoria?.ativa ?? true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      setErro('Informe um nome.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await onSubmit({ nome: nome.trim(), ativa })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar categoria')
      setSalvando(false)
    }
  }

  return (
    <Modal title={categoria ? 'Editar categoria' : 'Nova categoria'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
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
          Categoria ativa
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
