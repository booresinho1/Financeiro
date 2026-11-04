import { useId } from 'react'
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency, formatDate } from '@/lib/format'
import type { PontoCaixa } from '@/lib/inicio'

// mora dentro do painel escuro, que é escuro nos dois temas: cores fixas
const BRANCO = '#ffffff'
const LIMAO = '#c8f560'
const VERMELHO = '#ff8a8f'
const FUNDO = '#151824'
const MAX_EVENTOS_NO_TOOLTIP = 4
const MAX_ROTULOS = 4
const DISTANCIA_ROTULOS = { larga: 3, estreita: 7 }

function diaMes(iso: string): string {
  return formatDate(iso).slice(0, 5)
}

function liquidoDoDia(p: PontoCaixa): number {
  return p.eventos.reduce((s, e) => s + e.valor, 0)
}

function valorCurto(v: number): string {
  const inteiro = Math.abs(v).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
  return `${v > 0 ? '+' : '−'}${inteiro}`
}

/** Os maiores movimentos do mês, sem deixar dois rótulos colados. */
function diasComRotulo(pontos: PontoCaixa[]): Set<number> {
  const estreita = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  const distancia = estreita ? DISTANCIA_ROTULOS.estreita : DISTANCIA_ROTULOS.larga
  const escolhidos: number[] = []
  for (const p of [...pontos]
    .filter((x) => x.eventos.length > 0)
    .sort((a, b) => Math.abs(liquidoDoDia(b)) - Math.abs(liquidoDoDia(a)))) {
    if (escolhidos.length >= MAX_ROTULOS) break
    if (escolhidos.every((dia) => Math.abs(dia - p.dia) >= distancia)) escolhidos.push(p.dia)
  }
  return new Set(escolhidos)
}

function TooltipDia({ active, payload }: { active?: boolean; payload?: { payload: PontoCaixa }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const resto = p.eventos.length - MAX_EVENTOS_NO_TOOLTIP
  return (
    <div className="max-w-[260px] rounded-lg border border-white/10 bg-[#0e1016]/95 px-3 py-2 text-[11px] text-white shadow-lg backdrop-blur">
      <p className="text-white/55">{diaMes(p.data)}</p>
      <p className="mt-1 flex justify-between gap-4">
        <span className="text-white/70">Só as contas</span>
        <b className={`font-semibold ${p.saldo < 0 ? 'text-[#ff8a8f]' : ''}`}>
          {formatCurrency(p.saldo)}
        </b>
      </p>
      <p className="flex justify-between gap-4">
        <span className="text-white/70">No seu ritmo</span>
        <b className={`font-semibold ${p.noRitmo < 0 ? 'text-[#ff8a8f]' : ''}`}>
          {formatCurrency(p.noRitmo)}
        </b>
      </p>
      {p.eventos.length > 0 && <div className="my-1.5 h-px bg-white/10" />}
      {p.eventos.slice(0, MAX_EVENTOS_NO_TOOLTIP).map((e) => (
        <p key={e.id} className="mt-0.5 flex justify-between gap-3 text-white/70">
          <span className="truncate">{e.titulo}</span>
          <span className="shrink-0">
            {e.valor > 0 ? '+' : '−'} {formatCurrency(Math.abs(e.valor))}
          </span>
        </p>
      ))}
      {resto > 0 && <p className="mt-0.5 text-white/45">e mais {resto}</p>}
    </div>
  )
}

export function SaldoDiaADia({ pontos }: { pontos: PontoCaixa[] }) {
  const id = useId().replace(/:/g, '')
  const saldos = pontos.map((p) => p.saldo)
  const ritmos = pontos.map((p) => p.noRitmo)
  const maior = Math.max(0, ...saldos, ...ritmos)
  const menor = Math.min(0, ...saldos, ...ritmos)

  // a cor troca exatamente no zero; sem cruzar o zero, a linha tem uma cor só
  const maiorSaldo = Math.max(0, ...saldos)
  const menorSaldo = Math.min(0, ...saldos)
  const saldoCruza = maiorSaldo > 0 && menorSaldo < 0
  const corteSaldo = maiorSaldo - menorSaldo > 0 ? maiorSaldo / (maiorSaldo - menorSaldo) : 1
  const maiorRitmo = Math.max(...ritmos)
  const menorRitmo = Math.min(...ritmos)
  const ritmoCruza = maiorRitmo > 0 && menorRitmo < 0
  const corteRitmo = ritmoCruza ? maiorRitmo / (maiorRitmo - menorRitmo) : 0

  const comRotulo = diasComRotulo(pontos)
  const primeiro = pontos[0]
  const ultimo = pontos[pontos.length - 1]
  const ticks = [...new Set([primeiro.dia, ...comRotulo, ultimo.dia])].sort((a, b) => a - b)
  const dataDoDia = new Map(pontos.map((p) => [p.dia, p.data]))
  const pontoDoDia = new Map(pontos.map((p) => [p.dia, p]))

  return (
    <div className="h-[208px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={pontos} margin={{ top: 26, right: 14, bottom: 0, left: 14 }}>
          <defs>
            <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={LIMAO} stopOpacity={0.2} />
              <stop offset={corteSaldo} stopColor={LIMAO} stopOpacity={0.02} />
              <stop offset={corteSaldo} stopColor={VERMELHO} stopOpacity={0.02} />
              <stop offset="1" stopColor={VERMELHO} stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id={`linha-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset={corteSaldo} stopColor={LIMAO} />
              <stop offset={corteSaldo} stopColor={VERMELHO} />
            </linearGradient>
            <linearGradient id={`ritmo-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset={corteRitmo} stopColor={BRANCO} stopOpacity={0.6} />
              <stop offset={corteRitmo} stopColor={VERMELHO} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="dia"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={ticks}
            interval="preserveStartEnd"
            minTickGap={10}
            tickFormatter={(dia: number) =>
              dia === primeiro.dia ? 'hoje' : diaMes(dataDoDia.get(dia) ?? '')
            }
            tick={{ fill: 'rgb(255 255 255 / 0.5)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[menor, maior]} hide />
          <Tooltip
            content={<TooltipDia />}
            cursor={{ stroke: BRANCO, strokeOpacity: 0.25, strokeWidth: 1 }}
          />
          <ReferenceLine
            y={0}
            stroke={BRANCO}
            strokeOpacity={0.3}
            strokeDasharray="2 3"
            label={{
              value: 'R$ 0',
              position: 'insideBottomRight',
              fill: 'rgb(255 255 255 / 0.4)',
              fontSize: 10,
            }}
          />
          <Area
            type="stepAfter"
            dataKey="saldo"
            baseValue={0}
            stroke={saldoCruza ? `url(#linha-${id})` : menorSaldo < 0 ? VERMELHO : LIMAO}
            strokeWidth={2}
            fill={`url(#area-${id})`}
            activeDot={{ r: 4, fill: LIMAO, stroke: FUNDO, strokeWidth: 2 }}
            isAnimationActive={false}
            dot={(props: { cx?: number; cy?: number; payload?: PontoCaixa }) => {
              const { cx, cy, payload } = props
              if (cx === undefined || cy === undefined || !payload?.eventos.length) {
                return <g key={`vazio-${payload?.dia}`} />
              }
              const rotulado = comRotulo.has(payload.dia)
              const naEsquerda = payload.dia - primeiro.dia <= 1
              const naDireita = ultimo.dia - payload.dia <= 1
              return (
                <g key={`marca-${payload.dia}`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={payload.saldo < 0 ? VERMELHO : LIMAO}
                    stroke={FUNDO}
                    strokeWidth={2}
                  />
                  {rotulado && (
                    <text
                      x={cx}
                      y={cy - 10}
                      textAnchor={naEsquerda ? 'start' : naDireita ? 'end' : 'middle'}
                      fill="rgb(255 255 255 / 0.85)"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {valorCurto(liquidoDoDia(pontoDoDia.get(payload.dia) ?? payload))}
                    </text>
                  )}
                </g>
              )
            }}
          />
          <Line
            type="stepAfter"
            dataKey="noRitmo"
            stroke={ritmoCruza ? `url(#ritmo-${id})` : menorRitmo < 0 ? VERMELHO : BRANCO}
            strokeOpacity={ritmoCruza || menorRitmo < 0 ? 1 : 0.6}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={{ r: 3, fill: BRANCO, stroke: FUNDO, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
