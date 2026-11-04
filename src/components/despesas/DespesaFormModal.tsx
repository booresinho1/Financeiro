import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Check, Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { CategoriaFormModal } from '@/components/configuracoes/CategoriaFormModal'
import { SubcategoriaFormModal } from '@/components/configuracoes/SubcategoriaFormModal'
import { useCategorias } from '@/hooks/useCategorias'
import { useSubcategorias } from '@/hooks/useSubcategorias'
import { useDespesas } from '@/hooks/useDespesas'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { hojeIso } from '@/lib/datas'
import { emojiDaCategoria } from '@/lib/emojiCategoria'
import { formatCurrency, formatDate, nomeBonito } from '@/lib/format'
import { resumirOrcamentos, somarDias } from '@/lib/inicio'
import type { Despesa } from '@/types/finance'
import type { NovaDespesa } from '@/repositories/despesasRepository'

interface DespesaFormModalProps {
  despesa?: Despesa
  onClose: () => void
  onSubmit: (dados: NovaDespesa) => Promise<void>
}

const DIAS_DO_HISTORICO = 180
const MAX_FREQUENTES = 6
const TAMANHO_MAX_FREQUENTE = 28
const MS_DO_AVISO = 2600

function chaveDaDescricao(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Só dígitos e uma vírgula, com até duas casas: aceita "12.5" e "12,5". */
function limparValor(texto: string): string {
  const [inteiro, ...resto] = texto.replace(/[^\d.,]/g, '').replace(/\./g, ',').split(',')
  return resto.length ? `${inteiro},${resto.join('').slice(0, 2)}` : inteiro
}

function Chip({
  ativo,
  onClick,
  children,
  titulo,
}: {
  ativo: boolean
  onClick: () => void
  children: ReactNode
  titulo?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-pressed={ativo}
      className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        ativo
          ? 'border-brand bg-brand-soft text-brand'
          : 'border-line bg-surface text-ink-soft hover:bg-surface-2'
      }`}
    >
      {children}
    </button>
  )
}

export function DespesaFormModal({ despesa, onClose, onSubmit }: DespesaFormModalProps) {
  const editando = !!despesa
  const hoje = hojeIso()
  const valorRef = useRef<HTMLInputElement>(null)

  const [data, setData] = useState(despesa?.data.slice(0, 10) ?? hoje)
  const [descricao, setDescricao] = useState(despesa?.descricao ?? '')
  const [valor, setValor] = useState(despesa ? String(despesa.valor).replace('.', ',') : '')
  const [categoria, setCategoria] = useState(despesa?.categoria ?? '')
  const [subcategoria, setSubcategoria] = useState(despesa?.subcategoria ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [criandoCategoria, setCriandoCategoria] = useState(false)
  const [criandoSubcategoria, setCriandoSubcategoria] = useState(false)

  const { categorias, criar: criarCategoria } = useCategorias()
  const { subcategorias, criar: criarSubcategoria } = useSubcategorias()
  const { despesas } = useDespesas()
  const { orcamentos } = useOrcamentos()

  useEffect(() => {
    if (!aviso) return
    const timer = setTimeout(() => setAviso(null), MS_DO_AVISO)
    return () => clearTimeout(timer)
  }, [aviso])

  // o que você já lançou antes: dá atalho para o que se repete e aprende a categoria de cada descrição
  const porDescricao = useMemo(() => {
    const desde = somarDias(hoje, -DIAS_DO_HISTORICO)
    const mapa = new Map<
      string,
      { descricao: string; categoria: string; subcategoria: string; qtd: number; ultima: string }
    >()
    for (const d of despesas) {
      const dia = d.data.slice(0, 10)
      const chave = chaveDaDescricao(d.descricao)
      if (dia < desde || chave.length < 3 || chave.length > TAMANHO_MAX_FREQUENTE) continue
      if (/^parcela \d/i.test(chave)) continue
      const atual = mapa.get(chave)
      if (!atual) {
        mapa.set(chave, { ...d, descricao: d.descricao.trim(), qtd: 1, ultima: dia })
      } else {
        atual.qtd++
        if (dia >= atual.ultima) {
          atual.ultima = dia
          atual.descricao = d.descricao.trim()
          atual.categoria = d.categoria
          atual.subcategoria = d.subcategoria
        }
      }
    }
    return mapa
  }, [despesas, hoje])

  const frequentes = useMemo(
    () =>
      [...porDescricao.values()]
        .filter((f) => f.qtd >= 2)
        .sort((a, b) => b.qtd - a.qtd || b.ultima.localeCompare(a.ultima))
        .slice(0, MAX_FREQUENTES),
    [porDescricao]
  )

  const categoriasAtivas = categorias.filter((c) => c.ativa)
  const nomesDasCategorias = categoriasAtivas.some((c) => c.nome === categoria) || !categoria
    ? categoriasAtivas.map((c) => c.nome)
    : [...categoriasAtivas.map((c) => c.nome), categoria]
  nomesDasCategorias.sort((a, b) => a.localeCompare(b))

  const categoriaEscolhida = categorias.find((c) => c.nome === categoria)
  const nomesDasSubcategorias = (() => {
    const lista = categoriaEscolhida
      ? subcategorias
          .filter((s) => s.idCategoria === categoriaEscolhida.id && s.ativa)
          .map((s) => s.nome)
      : []
    if (subcategoria && !lista.includes(subcategoria)) lista.push(subcategoria)
    return lista.sort((a, b) => a.localeCompare(b))
  })()

  const valorNumerico = Number(valor.replace(',', '.')) || 0

  // quanto ainda cabe no orçamento da categoria no mês da despesa
  const hint = useMemo(() => {
    if (!categoria) return null
    const mes = data.slice(0, 7)
    const resumo = resumirOrcamentos(orcamentos, despesas, mes, hoje)
    const linha =
      resumo.linhas.find((l) => l.categoria === categoria && l.subcategoria === subcategoria) ??
      resumo.linhas.find((l) => l.categoria === categoria && !l.subcategoria)
    if (!linha) return null
    // ao editar, esta despesa já está no gasto do mês: tira para não contar duas vezes
    const jaContada =
      despesa &&
      despesa.data.slice(0, 7) === mes &&
      despesa.categoria === linha.categoria &&
      (!linha.subcategoria || despesa.subcategoria === linha.subcategoria)
    const gastoSemEsta = linha.gasto - (jaContada ? despesa.valor : 0)
    return { linha, gastoSemEsta }
  }, [categoria, subcategoria, data, orcamentos, despesas, hoje, despesa])

  function escolherCategoria(nome: string) {
    setCategoria(nome)
    setSubcategoria('')
  }

  function mudarDescricao(texto: string) {
    setDescricao(texto)
    // descrição conhecida e nada escolhido ainda: já sugere a categoria de sempre
    if (editando || categoria) return
    const conhecida = porDescricao.get(chaveDaDescricao(texto))
    if (conhecida) {
      setCategoria(conhecida.categoria)
      setSubcategoria(conhecida.subcategoria)
    }
  }

  async function salvar(continuar: boolean) {
    if (!data) return setErro('Escolha a data.')
    if (valorNumerico <= 0) return setErro('Informe o valor da despesa.')
    if (!descricao.trim()) return setErro('Escreva uma descrição.')
    if (!categoria || !subcategoria) return setErro('Escolha a categoria e a subcategoria.')

    setSalvando(true)
    setErro(null)
    const dados: NovaDespesa = {
      data,
      descricao: descricao.trim(),
      valor: valorNumerico,
      categoria,
      subcategoria,
    }
    try {
      await onSubmit(dados)
      if (!continuar) {
        onClose()
        return
      }
      setAviso(`${descricao.trim()} · ${formatCurrency(valorNumerico)} salva`)
      setValor('')
      setDescricao('')
      setCategoria('')
      setSubcategoria('')
      setSalvando(false)
      valorRef.current?.focus()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar despesa')
      setSalvando(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    salvar(false)
  }

  const ontem = somarDias(hoje, -1)
  const anteontem = somarDias(hoje, -2)
  const atalhosDeData = [
    { rotulo: 'Hoje', dia: hoje },
    { rotulo: 'Ontem', dia: ontem },
    { rotulo: 'Anteontem', dia: anteontem },
  ]
  const dataPersonalizada = !atalhosDeData.some((a) => a.dia === data)

  const restaDepois = hint ? hint.linha.orcado - hint.gastoSemEsta - valorNumerico : 0
  const corDoHint = !hint
    ? ''
    : restaDepois < 0
      ? 'var(--color-expense)'
      : restaDepois < hint.linha.orcado * 0.2
        ? 'var(--color-warning)'
        : 'var(--color-income)'

  return (
    <Modal title={editando ? 'Editar despesa' : 'Nova despesa'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-2xl bg-surface-2/60 px-4 py-3.5">
          <label htmlFor="valor-despesa" className="text-xs font-medium text-ink-muted">
            Valor
          </label>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-ink-faint">R$</span>
            <input
              id="valor-despesa"
              ref={valorRef}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={valor}
              onChange={(e) => setValor(limparValor(e.target.value))}
              placeholder="0,00"
              className="w-full bg-transparent text-4xl font-semibold tracking-tight text-ink outline-none placeholder:text-ink-faint/50"
            />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Data</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {atalhosDeData.map((a) => (
              <Chip key={a.rotulo} ativo={data === a.dia} onClick={() => setData(a.dia)} titulo={formatDate(a.dia)}>
                {a.rotulo}
              </Chip>
            ))}
            <input
              type="date"
              value={data}
              max={hoje}
              onChange={(e) => e.target.value && setData(e.target.value)}
              aria-label="Outra data"
              className={`rounded-full border bg-surface px-3 py-1.5 text-[13px] font-medium ${
                dataPersonalizada ? 'border-brand text-brand' : 'border-line text-ink-soft'
              }`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="descricao-despesa" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Descrição
          </label>
          <input
            id="descricao-despesa"
            type="text"
            autoComplete="off"
            value={descricao}
            onChange={(e) => mudarDescricao(e.target.value)}
            placeholder="Ex.: Mercado, Uber, Pizza"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm"
          />
          {!editando && !descricao && frequentes.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-ink-faint">Frequentes</span>
              {frequentes.map((f) => (
                <button
                  key={f.descricao}
                  type="button"
                  onClick={() => {
                    setDescricao(f.descricao)
                    setCategoria(f.categoria)
                    setSubcategoria(f.subcategoria)
                  }}
                  title={`${nomeBonito(f.categoria)} · ${f.subcategoria}`}
                  className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {emojiDaCategoria(f.categoria)} {f.descricao}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Categoria</p>
          <div className="flex flex-wrap gap-1.5">
            {nomesDasCategorias.map((nome) => (
              <Chip key={nome} ativo={categoria === nome} onClick={() => escolherCategoria(nome)}>
                {emojiDaCategoria(nome)} {nomeBonito(nome)}
              </Chip>
            ))}
            <button
              type="button"
              aria-label="Nova categoria"
              title="Nova categoria"
              onClick={() => setCriandoCategoria(true)}
              className="flex items-center rounded-full border border-dashed border-line px-2.5 py-1.5 text-ink-faint transition-colors hover:border-brand hover:text-brand"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {categoria && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-soft">Subcategoria</p>
            <div className="flex flex-wrap gap-1.5">
              {nomesDasSubcategorias.map((nome) => (
                <Chip key={nome} ativo={subcategoria === nome} onClick={() => setSubcategoria(nome)}>
                  {nome}
                </Chip>
              ))}
              <button
                type="button"
                aria-label="Nova subcategoria"
                title="Nova subcategoria"
                onClick={() => setCriandoSubcategoria(true)}
                disabled={!categoriaEscolhida}
                className="flex items-center rounded-full border border-dashed border-line px-2.5 py-1.5 text-ink-faint transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {hint && (
          <div className="rounded-xl border border-line-soft bg-surface-2/50 p-3">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-ink-muted">
                {emojiDaCategoria(hint.linha.categoria)}{' '}
                {nomeBonito(hint.linha.subcategoria || hint.linha.categoria)} · orçamento do mês
              </span>
              <span className="shrink-0 text-ink-faint">{formatCurrency(hint.linha.orcado)}</span>
            </div>
            <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <span
                className="h-full bg-ink-faint/60"
                style={{ width: `${Math.min((hint.gastoSemEsta / hint.linha.orcado) * 100, 100)}%` }}
              />
              {valorNumerico > 0 && (
                <span
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min((valorNumerico / hint.linha.orcado) * 100, 100)}%`,
                    background: corDoHint,
                  }}
                />
              )}
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {valorNumerico > 0 ? (
                restaDepois < 0 ? (
                  <>
                    Com esta, passa <b className="font-semibold text-expense">{formatCurrency(-restaDepois)}</b>{' '}
                    do orçamento
                  </>
                ) : (
                  <>
                    Depois desta, restam{' '}
                    <b className="font-semibold" style={{ color: corDoHint }}>
                      {formatCurrency(restaDepois)}
                    </b>
                  </>
                )
              ) : (
                <>
                  Já gastou {formatCurrency(hint.gastoSemEsta)} · restam{' '}
                  <b className="font-semibold text-ink">
                    {formatCurrency(hint.linha.orcado - hint.gastoSemEsta)}
                  </b>
                </>
              )}
            </p>
          </div>
        )}

        <div aria-live="polite" className="min-h-4 text-sm">
          {erro && <p className="text-expense">{erro}</p>}
          {aviso && !erro && (
            <p className="flex items-center gap-1.5 text-income">
              <Check className="h-4 w-4" />
              {aviso}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
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
              className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-black/10 hover:bg-brand-hover disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
          {!editando && (
            <button
              type="button"
              disabled={salvando}
              onClick={() => salvar(true)}
              className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-soft disabled:opacity-60"
            >
              Salvar e adicionar outra
            </button>
          )}
        </div>
      </form>

      {criandoCategoria && (
        <CategoriaFormModal
          onClose={() => setCriandoCategoria(false)}
          onSubmit={async (dados) => {
            const criada = await criarCategoria(dados)
            escolherCategoria(criada.nome)
          }}
        />
      )}
      {criandoSubcategoria && categoriaEscolhida && (
        <SubcategoriaFormModal
          categorias={categorias}
          idCategoriaInicial={categoriaEscolhida.id}
          onClose={() => setCriandoSubcategoria(false)}
          onSubmit={async (dados) => {
            const criada = await criarSubcategoria(dados)
            setSubcategoria(criada.nome)
          }}
        />
      )}
    </Modal>
  )
}
