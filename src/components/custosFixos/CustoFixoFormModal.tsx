import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { SeletorCategoria } from '@/components/shared/SeletorCategoria'
import { SeletorSubcategoria } from '@/components/shared/SeletorSubcategoria'
import type { CustoFixo } from '@/types/finance'
import type { NovoCustoFixo } from '@/repositories/custosFixosRepository'

interface CustoFixoFormModalProps {
  custoFixo?: CustoFixo
  onClose: () => void
  onSubmit: (dados: NovoCustoFixo) => Promise<void>
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

export function CustoFixoFormModal({
  custoFixo,
  onClose,
  onSubmit,
}: CustoFixoFormModalProps) {
  const [descricao, setDescricao] = useState(custoFixo?.descricao ?? '')
  const [valorPrevisto, setValorPrevisto] = useState(
    custoFixo ? String(custoFixo.valorPrevisto) : ''
  )
  const [diaVencimento, setDiaVencimento] = useState(
    custoFixo ? String(custoFixo.diaVencimento) : '10'
  )
  const [dataInicio, setDataInicio] = useState(custoFixo?.dataInicio ?? hoje())
  const [categoria, setCategoria] = useState(custoFixo?.categoria ?? '')
  const [subcategoria, setSubcategoria] = useState(custoFixo?.subcategoria ?? '')
  const [ativo, setAtivo] = useState(custoFixo?.ativo ?? true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const valorNumerico = Number(valorPrevisto.replace(',', '.'))
    const dia = Number(diaVencimento)

    if (
      !descricao.trim() ||
      !valorNumerico ||
      !categoria.trim() ||
      !subcategoria.trim() ||
      dia < 1 ||
      dia > 31
    ) {
      setErro('Preencha todos os campos com valores válidos (dia entre 1 e 31).')
      return
    }

    setSalvando(true)
    setErro(null)
    try {
      await onSubmit({
        descricao: descricao.trim(),
        tipo: 'RECORRENTE',
        valorPrevisto: valorNumerico,
        periodicidade: 'MENSAL',
        diaVencimento: dia,
        dataInicio,
        categoria: categoria.trim(),
        subcategoria: subcategoria.trim(),
        ativo,
      })
      onClose()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar custo fixo')
      setSalvando(false)
    }
  }

  return (
    <Modal title={custoFixo ? 'Editar custo fixo' : 'Novo custo fixo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">Descrição</label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            placeholder="Aluguel, Academia, Internet..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Valor previsto (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorPrevisto}
              onChange={(e) => setValorPrevisto(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">Dia vencimento</label>
            <input
              type="number"
              min="1"
              max="31"
              value={diaVencimento}
              onChange={(e) => setDiaVencimento(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
              required
            />
          </div>
        </div>

        <SeletorCategoria
          value={categoria}
          onChange={(nome) => {
            setCategoria(nome)
            setSubcategoria('')
          }}
        />

        <SeletorSubcategoria value={subcategoria} onChange={setSubcategoria} nomeCategoria={categoria} />

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-1">
            Ativo desde <span className="text-ink-faint font-normal">(data de início)</span>
          </label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="rounded border-line"
          />
          Compromisso ativo
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
