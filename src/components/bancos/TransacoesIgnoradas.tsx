import { useMemo, useState } from 'react'
import { ChevronDown, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/format'
import type { TransacaoPendente } from '@/types/finance'

const POR_PAGINA = 40

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function TransacoesIgnoradas({
  ignoradas,
  onRestaurar,
}: {
  ignoradas: TransacaoPendente[]
  onRestaurar: (ts: TransacaoPendente[]) => Promise<void>
}) {
  const [aberta, setAberta] = useState(false)
  const [busca, setBusca] = useState('')
  const [escolhidas, setEscolhidas] = useState<Set<string>>(new Set())
  const [visiveis, setVisiveis] = useState(POR_PAGINA)
  const [trabalhando, setTrabalhando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const filtradas = useMemo(() => {
    const termo = semAcento(busca.trim())
    if (!termo) return ignoradas
    return ignoradas.filter((t) => semAcento(`${t.descricao} ${t.contaPluggy ?? ''}`).includes(termo))
  }, [ignoradas, busca])

  const mostradas = filtradas.slice(0, visiveis)
  const marcadasNoFiltro = filtradas.filter((t) => escolhidas.has(t.id))
  const todasMarcadas = filtradas.length > 0 && marcadasNoFiltro.length === filtradas.length
  const totalEscolhido = marcadasNoFiltro.reduce((s, t) => s + (t.tipo === 'DESPESA' ? t.valor : 0), 0)

  function alternar(id: string) {
    setEscolhidas((atual) => {
      const n = new Set(atual)
      if (!n.delete(id)) n.add(id)
      return n
    })
  }

  function alternarTodas() {
    setEscolhidas((atual) => {
      const n = new Set(atual)
      if (todasMarcadas) filtradas.forEach((t) => n.delete(t.id))
      else filtradas.forEach((t) => n.add(t.id))
      return n
    })
  }

  async function restaurar(ts: TransacaoPendente[]) {
    if (!ts.length) return
    setErro(null)
    setTrabalhando(true)
    try {
      await onRestaurar(ts)
      setEscolhidas((atual) => {
        const n = new Set(atual)
        ts.forEach((t) => n.delete(t.id))
        return n
      })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao trazer de volta')
    } finally {
      setTrabalhando(false)
    }
  }

  if (!ignoradas.length) return null

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setAberta((a) => !a)}
        aria-expanded={aberta}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-2/60"
      >
        <span>
          <span className="block text-sm font-semibold text-ink">Ignoradas ({ignoradas.length})</span>
          <span className="block text-xs text-ink-muted">
            Descartadas da fila. Dá para trazer de volta quando quiser.
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${aberta ? 'rotate-180' : ''}`} />
      </button>

      {aberta && (
        <div className="mt-3 rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
            <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" />
              <input
                type="search"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  setVisiveis(POR_PAGINA)
                }}
                placeholder="Buscar por descrição ou conta"
                aria-label="Buscar nas ignoradas"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={todasMarcadas} onChange={alternarTodas} />
              {busca ? `Todas as ${filtradas.length} da busca` : 'Todas'}
            </label>
            <Button
              icon={<RotateCcw className="h-4 w-4" />}
              disabled={!marcadasNoFiltro.length || trabalhando}
              onClick={() => restaurar(marcadasNoFiltro)}
            >
              {trabalhando ? 'Trazendo...' : `Trazer de volta${marcadasNoFiltro.length ? ` (${marcadasNoFiltro.length})` : ''}`}
            </Button>
          </div>

          {marcadasNoFiltro.length > 0 && (
            <p className="border-b border-line-soft px-4 py-2 text-xs text-ink-muted">
              {marcadasNoFiltro.length} selecionada(s)
              {totalEscolhido > 0 && <> · {formatCurrency(totalEscolhido)} em despesas</>}
            </p>
          )}
          {erro && <p className="border-b border-line-soft px-4 py-2 text-xs text-expense">{erro}</p>}

          {filtradas.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-faint">Nada encontrado para essa busca.</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {mostradas.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={escolhidas.has(t.id)}
                    onChange={() => alternar(t.id)}
                    aria-label={`Selecionar ${t.descricao}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{t.descricao}</p>
                    <p className="text-xs text-ink-faint">
                      {formatDate(t.data)}
                      {t.contaPluggy && ` · ${t.contaPluggy}`}
                      {t.parcelaTotal && t.parcelaTotal > 1 ? ` · parcela ${t.parcelaNumero}/${t.parcelaTotal}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${t.tipo === 'DESPESA' ? 'text-expense' : 'text-income'}`}
                  >
                    {t.tipo === 'DESPESA' ? '-' : '+'}
                    {formatCurrency(t.valor)}
                  </span>
                  <button
                    type="button"
                    onClick={() => restaurar([t])}
                    disabled={trabalhando}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft disabled:opacity-50"
                  >
                    Trazer de volta
                  </button>
                </li>
              ))}
            </ul>
          )}

          {filtradas.length > visiveis && (
            <div className="border-t border-line-soft px-4 py-3 text-center">
              <button
                type="button"
                onClick={() => setVisiveis((v) => v + POR_PAGINA)}
                className="text-sm font-semibold text-brand hover:underline"
              >
                Mostrar mais ({filtradas.length - visiveis} restantes)
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
