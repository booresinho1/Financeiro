import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { somarMeses } from '@/lib/datas'

const CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Props {
  /** YYYY-MM */
  valor: string
  onChange: (mes: string) => void
  /** meses com algum lançamento, marcados com um ponto */
  comDados?: Set<string>
  /** mês de hoje, YYYY-MM */
  hoje: string
}

export function SeletorMes({ valor, onChange, comDados, hoje }: Props) {
  const [aberto, setAberto] = useState(false)
  const [ano, setAno] = useState(Number(valor.slice(0, 4)))
  const raiz = useRef<HTMLDivElement>(null)
  const mesNum = Number(valor.slice(5)) - 1

  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => !raiz.current?.contains(e.target as Node) && setAberto(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('pointerdown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  function abrir() {
    setAno(Number(valor.slice(0, 4)))
    setAberto((a) => !a)
  }

  function escolher(mes: string) {
    onChange(mes)
    setAberto(false)
  }

  const passo = (n: number) => onChange(somarMeses(`${valor}-01`, n).slice(0, 7))

  return (
    <div ref={raiz} className="relative">
      <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-card">
        <button
          type="button"
          onClick={() => passo(-1)}
          aria-label="Mês anterior"
          className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={abrir}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          className="flex min-w-[178px] items-center justify-center gap-2 rounded-xl px-3 py-1.5 transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-sm font-semibold text-ink">{LONGOS[mesNum]}</span>
            <span className="block text-[11px] text-ink-faint">{valor.slice(0, 4)}</span>
          </span>
          <ChevronDown className={`ml-auto h-4 w-4 text-ink-faint transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => passo(1)}
          aria-label="Próximo mês"
          className="rounded-xl p-2 text-ink-muted transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {aberto && (
        <div
          role="dialog"
          aria-label="Escolher mês"
          className="animate-aparecer absolute right-0 top-full z-40 mt-2 w-[292px] rounded-2xl border border-line bg-surface p-3 shadow-2xl shadow-black/20"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setAno((a) => a - 1)}
              aria-label="Ano anterior"
              className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-ink">{ano}</span>
            <button
              type="button"
              onClick={() => setAno((a) => a + 1)}
              aria-label="Próximo ano"
              className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {CURTOS.map((nome, m) => {
              const mes = `${ano}-${String(m + 1).padStart(2, '0')}`
              const escolhido = mes === valor
              const ehHoje = mes === hoje
              const temDados = comDados?.has(mes)
              return (
                <button
                  key={mes}
                  type="button"
                  onClick={() => escolher(mes)}
                  aria-current={escolhido ? 'date' : undefined}
                  className={`relative flex h-12 flex-col items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                    escolhido
                      ? 'bg-brand text-white shadow-md shadow-brand/30'
                      : ehHoje
                        ? 'text-brand ring-1 ring-inset ring-brand/40 hover:bg-brand-soft'
                        : temDados
                          ? 'text-ink hover:bg-surface-2'
                          : 'text-ink-faint hover:bg-surface-2 hover:text-ink-muted'
                  }`}
                >
                  {nome}
                  <span
                    className={`mt-1 h-1 w-1 rounded-full ${
                      temDados ? (escolhido ? 'bg-white/80' : 'bg-brand') : 'bg-transparent'
                    }`}
                  />
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-2.5">
            <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
              <span className="h-1 w-1 rounded-full bg-brand" /> tem lançamentos
            </span>
            <button
              type="button"
              onClick={() => escolher(hoje)}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
            >
              Mês atual
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
