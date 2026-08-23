import { useMemo, useState } from 'react'
import { Plus, Settings, Pencil, Download, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { CategoriaFormModal } from '@/components/configuracoes/CategoriaFormModal'
import { SubcategoriaFormModal } from '@/components/configuracoes/SubcategoriaFormModal'
import { useCategorias } from '@/hooks/useCategorias'
import { useSubcategorias } from '@/hooks/useSubcategorias'
import { useDespesas } from '@/hooks/useDespesas'
import type { Categoria, Subcategoria } from '@/types/finance'
import type { NovaCategoria } from '@/repositories/categoriasRepository'
import type { NovaSubcategoria } from '@/repositories/subcategoriasRepository'

export function Configuracoes() {
  const {
    categorias,
    carregando: carregandoCategorias,
    erro: erroCategorias,
    criar: criarCategoria,
    atualizar: atualizarCategoria,
    recarregar: recarregarCategorias,
  } = useCategorias()
  const {
    subcategorias,
    carregando: carregandoSubcategorias,
    criar: criarSubcategoria,
    atualizar: atualizarSubcategoria,
    recarregar: recarregarSubcategorias,
  } = useSubcategorias()
  const { despesas } = useDespesas()

  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | undefined>()
  const [modalSubAberto, setModalSubAberto] = useState(false)
  const [subcategoriaEditando, setSubcategoriaEditando] = useState<Subcategoria | undefined>()
  const [idCategoriaParaNovaSub, setIdCategoriaParaNovaSub] = useState<string | undefined>()
  const [importando, setImportando] = useState(false)

  const carregando = carregandoCategorias || carregandoSubcategorias

  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => a.nome.localeCompare(b.nome)),
    [categorias]
  )

  function subcategoriasDe(idCategoria: string) {
    return subcategorias
      .filter((s) => s.idCategoria === idCategoria)
      .sort((a, b) => a.nome.localeCompare(b.nome))
  }

  function abrirNovaCategoria() {
    setCategoriaEditando(undefined)
    setModalCategoriaAberto(true)
  }

  function abrirEdicaoCategoria(categoria: Categoria) {
    setCategoriaEditando(categoria)
    setModalCategoriaAberto(true)
  }

  async function handleSubmitCategoria(dados: NovaCategoria) {
    if (categoriaEditando) {
      await atualizarCategoria(categoriaEditando.id, dados)
    } else {
      await criarCategoria(dados)
    }
  }

  async function handleToggleCategoria(categoria: Categoria) {
    await atualizarCategoria(categoria.id, { nome: categoria.nome, ativa: !categoria.ativa })
  }

  function abrirNovaSubcategoria(idCategoria: string) {
    setSubcategoriaEditando(undefined)
    setIdCategoriaParaNovaSub(idCategoria)
    setModalSubAberto(true)
  }

  function abrirEdicaoSubcategoria(subcategoria: Subcategoria) {
    setSubcategoriaEditando(subcategoria)
    setIdCategoriaParaNovaSub(undefined)
    setModalSubAberto(true)
  }

  async function handleSubmitSubcategoria(dados: NovaSubcategoria) {
    if (subcategoriaEditando) {
      await atualizarSubcategoria(subcategoriaEditando.id, dados)
    } else {
      await criarSubcategoria(dados)
    }
  }

  async function handleToggleSubcategoria(subcategoria: Subcategoria) {
    await atualizarSubcategoria(subcategoria.id, {
      idCategoria: subcategoria.idCategoria,
      nome: subcategoria.nome,
      ativa: !subcategoria.ativa,
    })
  }

  async function handleImportarDaPlanilha() {
    setImportando(true)
    try {
      const mapaCategoria = new Map<string, Categoria>(categorias.map((c) => [c.nome, c]))

      const nomesCategoria = Array.from(new Set(despesas.map((d) => d.categoria))).filter(Boolean)
      for (const nome of nomesCategoria) {
        if (!mapaCategoria.has(nome)) {
          const criada = await criarCategoria({ nome, ativa: true })
          mapaCategoria.set(nome, criada)
        }
      }

      const paresSubExistentes = new Set(
        subcategorias.map((s) => `${s.idCategoria}::${s.nome}`)
      )
      const paresSubNasDespesas = new Set(
        despesas
          .filter((d) => d.categoria && d.subcategoria)
          .map((d) => `${d.categoria}::${d.subcategoria}`)
      )

      for (const par of paresSubNasDespesas) {
        const [nomeCategoria, nomeSub] = par.split('::')
        const categoria = mapaCategoria.get(nomeCategoria)
        if (!categoria) continue
        const chave = `${categoria.id}::${nomeSub}`
        if (!paresSubExistentes.has(chave)) {
          await criarSubcategoria({ idCategoria: categoria.id, nome: nomeSub, ativa: true })
        }
      }

      await Promise.all([recarregarCategorias(), recarregarSubcategorias()])
    } finally {
      setImportando(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Categorias e subcategorias usadas em despesas, orçamentos e custos fixos"
        action={
          <div className="flex gap-2">
            <button
              onClick={handleImportarDaPlanilha}
              disabled={importando}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-soft shadow-sm shadow-slate-900/[0.02] hover:bg-surface-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {importando ? 'Importando...' : 'Importar da planilha'}
            </button>
            <button
              onClick={abrirNovaCategoria}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10"
            >
              <Plus className="h-4 w-4" />
              Nova categoria
            </button>
          </div>
        }
      />

      {erroCategorias && (
        <div className="mb-4 rounded-xl border border-expense/25 bg-expense-soft px-4 py-3 text-sm text-expense">
          {erroCategorias}
        </div>
      )}

      {carregando ? (
        <div className="rounded-2xl border border-line bg-surface py-16 text-center text-sm text-ink-muted shadow-sm shadow-slate-900/[0.02]">
          Carregando...
        </div>
      ) : categoriasOrdenadas.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="Nenhuma categoria cadastrada"
          description='Clique em "Importar da planilha" pra trazer as categorias e subcategorias já usadas em Despesas, ou crie uma nova manualmente.'
        />
      ) : (
        <div className="rounded-2xl border border-line bg-surface divide-y divide-slate-100 shadow-sm shadow-slate-900/[0.02]">
          {categoriasOrdenadas.map((categoria) => (
            <div key={categoria.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${categoria.ativa ? 'text-ink' : 'text-ink-faint line-through'}`}
                  >
                    {categoria.nome}
                  </span>
                  <button
                    aria-label="Editar categoria"
                    onClick={() => abrirEdicaoCategoria(categoria)}
                    className="p-1 text-ink-faint hover:text-brand"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                  {categoria.ativa ? 'Ativa' : 'Inativa'}
                  <input
                    type="checkbox"
                    checked={categoria.ativa}
                    onChange={() => handleToggleCategoria(categoria)}
                    className="rounded border-line"
                  />
                </label>
              </div>

              <div className="mt-2 ml-1 space-y-1.5">
                {subcategoriasDe(categoria.id).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between pl-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <ChevronRight className="h-3.5 w-3.5 text-ink-faint" />
                      <span className={sub.ativa ? 'text-ink-soft' : 'text-ink-faint line-through'}>
                        {sub.nome}
                      </span>
                      <button
                        aria-label="Editar subcategoria"
                        onClick={() => abrirEdicaoSubcategoria(sub)}
                        className="p-1 text-ink-faint hover:text-brand"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      type="checkbox"
                      checked={sub.ativa}
                      onChange={() => handleToggleSubcategoria(sub)}
                      className="rounded border-line"
                    />
                  </div>
                ))}
                <button
                  onClick={() => abrirNovaSubcategoria(categoria.id)}
                  className="pl-4 text-xs font-medium text-brand"
                >
                  + Subcategoria
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalCategoriaAberto && (
        <CategoriaFormModal
          categoria={categoriaEditando}
          onClose={() => setModalCategoriaAberto(false)}
          onSubmit={handleSubmitCategoria}
        />
      )}

      {modalSubAberto && (
        <SubcategoriaFormModal
          subcategoria={subcategoriaEditando}
          categorias={categoriasOrdenadas}
          idCategoriaInicial={idCategoriaParaNovaSub}
          onClose={() => setModalSubAberto(false)}
          onSubmit={handleSubmitSubcategoria}
        />
      )}
    </>
  )
}
