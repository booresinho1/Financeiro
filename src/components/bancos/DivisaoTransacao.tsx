import { Plus, Trash2 } from 'lucide-react'
import { SeletorCategoria } from '@/components/shared/SeletorCategoria'
import { SeletorSubcategoria } from '@/components/shared/SeletorSubcategoria'
import { useChartColors } from '@/lib/chartTheme'
import { adicionarParte, valoresDasPartes, type ParteDivisao } from '@/lib/divisao'
import { formatCurrency, nomeBonito } from '@/lib/format'

const MINIMO_DE_PARTES = 2

export function DivisaoTransacao({
  total,
  partes,
  onChange,
}: {
  total: number
  partes: ParteDivisao[]
  onChange: (partes: ParteDivisao[]) => void
}) {
  const { composicao } = useChartColors()
  const valores = valoresDasPartes(partes, total)
  const corDe = (i: number) => composicao[i % composicao.length]

  function alterar(id: string, parcial: Partial<ParteDivisao>) {
    onChange(partes.map((p) => (p.id === id ? { ...p, ...parcial } : p)))
  }

  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          {valores.map((v, i) =>
            v > 0 ? (
              <span
                key={partes[i].id}
                className="h-full transition-all duration-300"
                style={{ width: `${(v / total) * 100}%`, background: corDe(i) }}
              />
            ) : null
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-ink-muted">
          {partes.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-sm" style={{ background: corDe(i) }} />
              {nomeBonito(p.categoria) || `Parte ${i + 1}`}:{' '}
              <b className={`font-semibold ${valores[i] < 0 ? 'text-expense' : 'text-ink'}`}>
                {formatCurrency(valores[i])}
              </b>
              {valores[i] > 0 && (
                <span className="text-ink-faint">{((valores[i] / total) * 100).toFixed(0)}%</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {partes.map((p, i) => {
          const ultima = i === partes.length - 1
          return (
            <li key={p.id} className="rounded-xl border border-line-soft bg-surface-2/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
                  <i className="h-2.5 w-2.5 rounded-sm" style={{ background: corDe(i) }} />
                  Parte {i + 1}
                </span>
                {partes.length > MINIMO_DE_PARTES && (
                  <button
                    type="button"
                    aria-label={`Remover parte ${i + 1}`}
                    onClick={() => onChange(partes.filter((x) => x.id !== p.id))}
                    className="text-ink-faint hover:text-expense"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-[8.5rem_1fr_1fr]">
                <div>
                  <label className="block text-sm font-medium text-ink-soft mb-1">
                    Valor (R$)
                  </label>
                  {ultima ? (
                    <p
                      title="Esta parte fica com o que faltar para fechar a nota"
                      className={`rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm font-semibold ${valores[i] < 0 ? 'text-expense' : 'text-ink'}`}
                    >
                      {valores[i].toFixed(2).replace('.', ',')}
                    </p>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={total}
                      value={p.valor}
                      onChange={(e) => alterar(p.id, { valor: e.target.value })}
                      aria-label={`Valor da parte ${i + 1}`}
                      className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm"
                    />
                  )}
                </div>
                <SeletorCategoria
                  value={p.categoria}
                  onChange={(categoria) => alterar(p.id, { categoria, subcategoria: '' })}
                />
                <SeletorSubcategoria
                  value={p.subcategoria}
                  onChange={(subcategoria) => alterar(p.id, { subcategoria })}
                  nomeCategoria={p.categoria}
                />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onChange(adicionarParte(partes, total))}
          className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar parte
        </button>
        <p className="text-[11px] text-ink-faint">A última parte fica com o que faltar da nota.</p>
      </div>
    </div>
  )
}
