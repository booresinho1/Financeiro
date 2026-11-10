import { useState } from 'react'
import { CircleCheck, Lightbulb, TriangleAlert } from 'lucide-react'
import { useChartColors } from '@/lib/chartTheme'
import { formatCurrency } from '@/lib/format'
import { insightsDoMes, type Dre } from '@/lib/dre'

const META_POUPANCA = 20
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const curto = (m: string) => MESES_CURTOS[Number(m.slice(5)) - 1]

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold text-ink-muted">{titulo}</p>
      {children}
    </div>
  )
}

function Poupanca({ margem, resultado, receitas }: { margem: number | null; resultado: number; receitas: number }) {
  if (margem === null) return <p className="mt-2 text-lg font-bold text-ink-faint">Sem receita no mês</p>
  // barra de 0 a 30%: o traço é a meta; mês negativo não enche nada e fica dito em vermelho
  const escala = Math.max(META_POUPANCA * 1.5, margem)
  const atingiu = margem >= META_POUPANCA
  const cor = margem < 0 ? 'text-expense' : atingiu ? 'text-income' : 'text-ink'
  const frase =
    margem < 0
      ? `Gastou ${formatCurrency(-resultado)} a mais do que entrou`
      : atingiu
        ? `Meta batida: guardou ${formatCurrency(resultado)}`
        : `Faltam ${formatCurrency(((META_POUPANCA - margem) / 100) * receitas)} para a meta`
  return (
    <>
      <p className={`mt-1 text-[32px] font-extrabold leading-none tracking-tight tabular-nums ${cor}`}>
        {margem.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
      </p>
      <p className={`mt-1.5 text-sm font-semibold ${margem < 0 ? 'text-expense' : 'text-ink-soft'}`}>{frase}</p>
      <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.06]">
        {margem > 0 && (
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${atingiu ? 'bg-income' : 'bg-brand'}`}
            style={{ width: `${(margem / escala) * 100}%` }}
          />
        )}
        <div aria-hidden className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `${(META_POUPANCA / escala) * 100}%` }} />
      </div>
      <div className="relative mt-1 h-4 text-[11px] font-medium text-ink-muted">
        <span>0%</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${(META_POUPANCA / escala) * 100}%` }}>
          meta {META_POUPANCA}%
        </span>
      </div>
    </>
  )
}

function ResultadoPorMes({ valores, meses }: { valores: number[]; meses: string[] }) {
  const cores = useChartColors()
  const atual = valores.length - 1
  const [foco, setFoco] = useState<number | null>(null)
  const max = Math.max(...valores.map(Math.abs), 1)
  const temNegativo = valores.some((v) => v < 0)
  const temPositivo = valores.some((v) => v > 0)
  const H = 64
  // o zero fica no meio só quando há meses dos dois lados
  const zero = temNegativo && temPositivo ? H / 2 : temNegativo ? 2 : H - 2
  const alcance = temNegativo && temPositivo ? H / 2 - 3 : H - 6
  const mostrado = foco ?? atual

  return (
    <div className="mt-3" onMouseLeave={() => setFoco(null)}>
      <div className="relative flex gap-1.5" style={{ height: H }}>
        <div aria-hidden className="absolute inset-x-0 h-px bg-line" style={{ top: zero }} />
        {valores.map((v, i) => {
          const h = Math.max((Math.abs(v) / max) * alcance, v === 0 ? 0 : 2)
          return (
            <button
              key={meses[i]}
              type="button"
              aria-label={`${curto(meses[i])}: ${formatCurrency(v)}`}
              onMouseEnter={() => setFoco(i)}
              onFocus={() => setFoco(i)}
              className="relative flex-1 focus-visible:outline-none"
            >
              <span
                className="absolute inset-x-0.5 rounded-[3px] transition-opacity"
                style={{
                  top: v >= 0 ? zero - h : zero,
                  height: h,
                  background: v < 0 ? cores.expense : cores.income,
                  opacity: i === mostrado ? 1 : 0.35,
                }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {meses.map((m, i) => (
          <span key={m} className={`flex-1 text-center text-[10.5px] ${i === mostrado ? 'font-bold text-ink' : 'text-ink-faint'}`}>
            {curto(m)}
          </span>
        ))}
      </div>
      {foco !== null && foco !== atual && (
        <p className="mt-1 text-[11px] text-ink-muted tabular-nums">
          {curto(meses[foco])}: <b className={valores[foco] < 0 ? 'text-expense' : 'text-income'}>{formatCurrency(valores[foco])}</b>
        </p>
      )}
    </div>
  )
}

export function IndicadoresDoMes({ dre, i }: { dre: Dre; i: number }) {
  const resultado = dre.resultado[i]
  const insights = insightsDoMes(dre, i)
  const meses = dre.meses.slice(0, i + 1)
  const valores = dre.resultado.slice(0, i + 1)
  const positivos = valores.filter((v) => v > 0).length

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
      <Bloco titulo="Taxa de poupança">
        <Poupanca margem={dre.margem[i]} resultado={resultado} receitas={dre.totalReceitas[i]} />
      </Bloco>

      <Bloco titulo="Resultado mês a mês">
        <p className="mt-1 text-lg font-extrabold leading-snug tracking-tight text-ink">
          {positivos === valores.length
            ? 'Todos os meses no azul'
            : positivos === 0
              ? 'Nenhum mês no azul'
              : `${positivos} de ${valores.length} meses no azul`}
        </p>
        <ResultadoPorMes valores={valores} meses={meses} />
      </Bloco>

      <Bloco titulo="O que chamou atenção">
        {insights.length ? (
          <ul className="mt-2.5 space-y-2.5">
            {insights.map((x) => (
              <li key={x.texto} className="flex items-start gap-2 text-[13px] font-medium leading-snug text-ink-soft">
                {x.tom === 'bom' ? (
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-income" />
                ) : x.tom === 'atencao' ? (
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                ) : (
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                )}
                {x.texto}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2.5 text-sm text-ink-faint">Lance mais um mês para comparar.</p>
        )}
      </Bloco>
    </div>
  )
}
