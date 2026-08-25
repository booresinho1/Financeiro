import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CategoriaFormModal } from '@/components/configuracoes/CategoriaFormModal'
import { useCategorias } from '@/hooks/useCategorias'

interface SeletorCategoriaProps {
  value: string
  onChange: (nomeCategoria: string) => void
  label?: string
  required?: boolean
}

export function SeletorCategoria({
  value,
  onChange,
  label = 'Categoria',
  required = true,
}: SeletorCategoriaProps) {
  const { categorias, criar } = useCategorias()
  const [modalAberto, setModalAberto] = useState(false)

  const opcoes = categorias.filter((c) => c.ativa)
  const opcoesComValorAtual =
    value && !opcoes.some((c) => c.nome === value)
      ? [...opcoes, { id: '__atual__', nome: value, ativa: true }]
      : opcoes

  return (
    <div>
      <label className="block text-sm font-medium text-ink-soft mb-1">
        {label} {!required && <span className="text-ink-faint font-normal">(opcional)</span>}
      </label>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm bg-surface"
          required={required}
        >
          <option value="" disabled={required}>
            {required ? 'Selecione...' : 'Nenhuma'}
          </option>
          {opcoesComValorAtual
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
        </select>
        <button
          type="button"
          aria-label="Nova categoria"
          onClick={() => setModalAberto(true)}
          className="shrink-0 rounded-lg border border-line px-2.5 text-ink-soft hover:bg-surface-2"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {modalAberto && (
        <CategoriaFormModal
          onClose={() => setModalAberto(false)}
          onSubmit={async (dados) => {
            const criada = await criar(dados)
            onChange(criada.nome)
          }}
        />
      )}
    </div>
  )
}
