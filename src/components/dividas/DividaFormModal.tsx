import { useEffect, useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { SeletorCategoria } from '@/components/shared/SeletorCategoria'
import { SeletorSubcategoria } from '@/components/shared/SeletorSubcategoria'
import type { NovaDivida } from '@/repositories/dividasRepository'
import type { Divida } from '@/types/finance'

interface DividaFormModalProps {
  divida?: Divida
  onClose: () => void
  onSubmit: (dados: NovaDivida) => Promise<void>
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

export function DividaFormModal({ divida, onClose, onSubmit }: DividaFormModalProps) {
  const editando = !!divida
  const [descricao, setDescricao] = useState(divida?.descricao ?? '')
  const [valorTotal, setValorTotal] = useState(divida ? String(divida.valorTotal) : '')
  const [numParcelas, setNumParcelas] = useState(divida ? String(divida.numParcelas) : '1')
  const [valorParcela, setValorParcela] = useState(divida ? String(divida.valorParcela) : '')
  const [primeiroVencimento, setPrimeiroVencimento] = useState(divida?.primeiroVencimento ?? hoje())
  const [categoria, setCategoria] = useState(divida?.categoria ?? '')
  const [subcategoria, setSubcategoria] = useState(divida?.subcategoria ?? '')
  const [observacao, setObservacao] = useState(divida?.observacao ?? '')
  const [salvando, setSalvando] = useState(false)
  const [progresso, setProgresso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Recalcula o valor da parcela automaticamente enquanto o usuário não editar esse campo manualmente.
  const [valorParcelaEditadoManualmente, setValorParcelaEditadoManualmente] = useState(editando)

  useEffect(() => {
    if (valorParcelaEditadoManualmente) return
    const total = Number(valorTotal.replace(',', '.'))
    const n = Number(numParcelas)
    if (total > 0 && n > 0) {
      setValorParcela((total / n).toFixed(2))
    }
  }, [valorTotal, numParcelas, valorParcelaEditadoManualmente])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const total = Number(valorTotal.replace(',', '.'))
    const n = Number(numParcelas)
    const parcela = Number(valorParcela.replace(',', '.'))

    if (!descricao.trim() || !total || n < 1 || !parcela || !primeiroVencimento) {
      setErro('Preencha descrição, valor total, número de parcelas e valor da parcela.')
      return
    }

    setSalvando(true)
    setErro(null)
    setProgresso(editando ? null : `Gerando ${n} parcela(s)...`)
    try {
      await onSubmit({
        descricao: descricao.trim(),
        valorTotal: total,
        numParcelas: n,
        valorParcela: parcela,
        primeiroVencimento,
        categoria: categoria.trim() || undefined,
        subcategoria: subcategoria.trim() || undefined,
        observacao: observacao.trim() || undefined,
      })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar dívida')
      setSalvando(false)
      setProgresso(null)
    }
  }

  return (
    <Modal title={editando ? 'Editar dívida' : 'Nova dívida'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            placeholder="Notebook, Empréstimo..."
            required
          />
        </div>

        {editando && (
          <p className="text-xs text-ink-faint bg-surface-2 rounded-lg px-3 py-2">
            Valor total, número de parcelas e vencimento não podem ser alterados depois de criada a
            dívida, porque as parcelas já foram geradas (e algumas podem já estar pagas).
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Valor total (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              disabled={editando}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm disabled:bg-surface-2 disabled:text-ink-faint"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Nº parcelas</label>
            <input
              type="number"
              min="1"
              value={numParcelas}
              onChange={(e) => setNumParcelas(e.target.value)}
              disabled={editando}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm disabled:bg-surface-2 disabled:text-ink-faint"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Valor de cada parcela (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={valorParcela}
            onChange={(e) => {
              setValorParcela(e.target.value)
              setValorParcelaEditadoManualmente(true)
            }}
            disabled={editando}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm disabled:bg-surface-2 disabled:text-ink-faint"
            required
          />
          {!editando && (
            <p className="text-xs text-ink-faint mt-1">Calculado automaticamente, mas pode ajustar.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Primeiro vencimento
          </label>
          <input
            type="date"
            value={primeiroVencimento}
            onChange={(e) => setPrimeiroVencimento(e.target.value)}
            disabled={editando}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm disabled:bg-surface-2 disabled:text-ink-faint"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SeletorCategoria
            value={categoria}
            onChange={(nome) => {
              setCategoria(nome)
              setSubcategoria('')
            }}
            required={false}
          />
          <SeletorSubcategoria
            value={subcategoria}
            onChange={setSubcategoria}
            nomeCategoria={categoria}
            required={false}
          />
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
        {progresso && !erro && <p className="text-sm text-ink-muted">{progresso}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface-2 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10 disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
