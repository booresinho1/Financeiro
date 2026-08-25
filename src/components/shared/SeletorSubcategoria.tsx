import { useState } from 'react'
import { Plus } from 'lucide-react'
import { SubcategoriaFormModal } from '@/components/configuracoes/SubcategoriaFormModal'
import { useCategorias } from '@/hooks/useCategorias'
import { useSubcategorias } from '@/hooks/useSubcategorias'

interface SeletorSubcategoriaProps {
  value: string
  onChange: (nomeSubcategoria: string) => void
  nomeCategoria: string
  label?: string
  required?: boolean
}

export function SeletorSubcategoria({
  value,
  onChange,
  nomeCategoria,
  label = 'Subcategoria',
  required = true,
}: SeletorSubcategoriaProps) {
  const { categorias } = useCategorias()
  const { subcategorias, criar } = useSubcategorias()
  const [modalAberto, setModalAberto] = useState(false)

  const categoria = categorias.find((c) => c.nome === nomeCategoria)

  const opcoes = categoria
    ? subcategorias.filter((s) => s.idCategoria === categoria.id && s.ativa)
    : []
  const opcoesComValorAtual =
    value && !opcoes.some((s) => s.nome === value)
      ? [...opcoes, { id: '__atual__', idCategoria: categoria?.id ?? '', nome: value, ativa: true }]
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
          disabled={!categoria}
          className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm bg-surface disabled:bg-surface-2 disabled:text-ink-faint"
          required={required}
        >
          <option value="" disabled={required && !!categoria}>
            {!categoria ? 'Escolha a categoria primeiro' : required ? 'Selecione...' : 'Nenhuma'}
          </option>
          {opcoesComValorAtual
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((s) => (
              <option key={s.id} value={s.nome}>
                {s.nome}
              </option>
            ))}
        </select>
        <button
          type="button"
          aria-label="Nova subcategoria"
          onClick={() => setModalAberto(true)}
          disabled={!categoria}
          className="shrink-0 rounded-lg border border-line px-2.5 text-ink-soft hover:bg-surface-2 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {modalAberto && categoria && (
        <SubcategoriaFormModal
          categorias={categorias}
          idCategoriaInicial={categoria.id}
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
