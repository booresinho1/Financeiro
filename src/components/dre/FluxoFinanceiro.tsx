import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Briefcase, CalendarClock, Coins, Ellipsis, PiggyBank, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useChartColors } from '@/lib/chartTheme'
import { EMOJI_PADRAO, emojiDaCategoria } from '@/lib/emojiCategoria'
import { formatCurrency } from '@/lib/format'
import type { FluxoDoMes, NoFluxo } from '@/lib/dre'
import type { SinalCategoria } from '@/lib/acao'
import { BarraUso } from '@/components/dre/Sinal'
import { ESTILO_NIVEL, legendaDoSinal, numeroDoSinal } from '@/components/dre/sinalEstilo'

// largura "de desenho"; abaixo dela o fluxo encolhe até ESCALA_MIN e depois rola
const X0 = 0
const W0 = 268
const X1 = 368
const W1 = 210
const X2 = 656
const W2 = 276
const X3 = 1016
const W3 = 196
const H0 = 92
const H1 = 236
const H2 = 100
const H3 = 50
const G0 = 16
const G2 = 14
const G3 = 8
const ESCALA_MIN = 0.72

interface Caixa {
  no: NoFluxo
  x: number
  y: number
  w: number
  h: number
  pai?: NoFluxo
}

interface Fita {
  id: string
  de: string
  para: string
  x1: number
  t1: number
  x2: number
  t2: number
  espessura: number
  cor1: string
  cor2: string
  /** nós cujo foco acende esta fita */
  ligados: string[]
  valor: number
  opacidade: number
  /** fatia que a via carrega na base do cartão em que chega (0 a 1) */
  fatia: number
  /** o que a fita abre ao ser clicada */
  abre: { no: NoFluxo; pai?: NoFluxo }
}

function caminho(f: Fita): string {
  const m = (f.x1 + f.x2) / 2
  const b1 = f.t1 + f.espessura
  const b2 = f.t2 + f.espessura
  return `M${f.x1},${f.t1}C${m},${f.t1} ${m},${f.t2} ${f.x2},${f.t2}L${f.x2},${b2}C${m},${b2} ${m},${b1} ${f.x1},${b1}Z`
}

function porcento(v: number, base: number): string {
  return base > 0 ? `${((v / base) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : ''
}

export function FluxoFinanceiro({
  fluxo,
  sinais,
  onAbrir,
}: {
  fluxo: FluxoDoMes
  sinais?: Map<string, SinalCategoria>
  onAbrir: (no: NoFluxo, pai: NoFluxo | undefined, cor: string) => void
}) {
  const cores = useChartColors()
  const { tema } = useTheme()
  const verde = tema === 'dark' ? '#25a862' : cores.income
  const externo = useRef<HTMLDivElement>(null)
  const prefixo = `f${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const [largura, setLargura] = useState(0)
  const [foco, setFoco] = useState<string | null>(null)
  const [dica, setDica] = useState<{ x: number; y: number; texto: string; valor: number; base: string } | null>(null)

  useLayoutEffect(() => {
    const el = externo.current
    if (!el) return
    const obs = new ResizeObserver(([e]) => setLargura(e.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const corDo = useCallback(
    function cor(no: NoFluxo, pai?: NoFluxo): string {
    switch (no.tipo) {
      case 'receita':
      case 'sobra':
        return verde
      case 'faltou':
        return cores.expense
      case 'categoria':
        return no.corIndice === undefined ? cores.inkMuted : cores.composicao[no.corIndice]
      case 'sub':
        return pai ? cor(pai) : cores.inkMuted
      default:
        return cores.inkMuted
    }
  },
    [cores, verde]
  )

  const desenho = useMemo(() => {
    const temSubs = fluxo.saidas.some((s) => s.filhos.length > 0)
    const W = temSubs ? X3 + W3 : X2 + W2

    // coluna das saídas: cada categoria ocupa o bloco das suas subcategorias
    const blocos = fluxo.saidas.map((s) => {
      const n = s.filhos.length
      const hSubs = n ? n * H3 + (n - 1) * G3 : 0
      return { s, hSubs, h: Math.max(H2, hSubs) }
    })
    const total2 = blocos.reduce((t, b) => t + b.h, 0) + G2 * Math.max(blocos.length - 1, 0)
    const total0 = fluxo.entradas.length * H0 + G0 * Math.max(fluxo.entradas.length - 1, 0)
    const H = Math.max(total2, total0, H1) + 8

    const caixas: Caixa[] = []
    let y = (H - total0) / 2
    for (const e of fluxo.entradas) {
      caixas.push({ no: e, x: X0, y, w: W0, h: H0 })
      y += H0 + G0
    }
    const centro = { x: X1, y: (H - H1) / 2, w: W1, h: H1 }
    y = (H - total2) / 2
    const subsPorPai = new Map<string, Caixa[]>()
    for (const b of blocos) {
      caixas.push({ no: b.s, x: X2, y: y + (b.h - H2) / 2, w: W2, h: H2 })
      let ys = y + (b.h - b.hSubs) / 2
      const subs: Caixa[] = []
      for (const f of b.s.filhos) {
        const c = { no: f, x: X3, y: ys, w: W3, h: H3, pai: b.s }
        caixas.push(c)
        subs.push(c)
        ys += H3 + G3
      }
      subsPorPai.set(b.s.id, subs)
      y += b.h + G2
    }

    // uma escala por nível, para a fita mais grossa caber no cartão em que chega
    const total = Math.max(fluxo.total, 0.01)
    const maxE = Math.max(...fluxo.entradas.map((e) => e.valor), 0.01)
    const maxS = Math.max(...fluxo.saidas.map((s) => s.valor), 0.01)
    const maxSub = Math.max(...fluxo.saidas.flatMap((s) => s.filhos.map((f) => f.valor)), 0.01)
    const k0 = Math.min((H1 - 20) / total, (H0 - 14) / maxE)
    const k1 = Math.min((H1 - 20) / total, (H2 - 12) / maxS)
    const k2 = Math.min(k1, (H3 - 10) / maxSub)
    const esp = (v: number, k: number) => Math.max(v * k, 5)
    // a cor da via fica mais forte conforme o peso que ela carrega
    const intensidade = (fatia: number) => 0.22 + 0.7 * Math.min(Math.max(fatia, 0), 1)
    const baseB = fluxo.receitas > 0 ? fluxo.receitas : total

    const fitas: Fita[] = []
    const meio = (c: { y: number; h: number }) => c.y + c.h / 2
    const cm = meio(centro)

    let pilha = cm - fluxo.entradas.reduce((t, e) => t + esp(e.valor, k0), 0) / 2
    for (const c of caixas.filter((c) => c.no.tipo === 'receita' || c.no.tipo === 'faltou')) {
      const t = esp(c.no.valor, k0)
      fitas.push({
        id: `a:${c.no.id}`,
        de: c.no.nome,
        para: 'Dinheiro do mês',
        x1: c.x + c.w - 2,
        t1: meio(c) - t / 2,
        x2: X1 + 2,
        t2: pilha,
        espessura: t,
        cor1: corDo(c.no),
        cor2: cores.brand,
        ligados: [c.no.id, 'centro'],
        valor: c.no.valor,
        fatia: c.no.valor / total,
        opacidade: intensidade(c.no.valor / total),
        abre: { no: c.no },
      })
      pilha += t
    }

    pilha = cm - fluxo.saidas.reduce((t, s) => t + esp(s.valor, k1), 0) / 2
    for (const c of caixas.filter((c) => c.x === X2)) {
      const t = esp(c.no.valor, k1)
      fitas.push({
        id: `b:${c.no.id}`,
        de: 'Dinheiro do mês',
        para: c.no.nome,
        x1: X1 + W1 - 2,
        t1: pilha,
        x2: c.x + 2,
        t2: meio(c) - t / 2,
        espessura: t,
        cor1: cores.brand,
        cor2: corDo(c.no),
        ligados: ['centro', c.no.id, ...c.no.filhos.map((f) => f.id)],
        valor: c.no.valor,
        fatia: c.no.valor / baseB,
        opacidade: intensidade(c.no.valor / baseB),
        abre: { no: c.no },
      })
      pilha += t

      const subs = subsPorPai.get(c.no.id) ?? []
      let p2 = meio(c) - subs.reduce((s, x) => s + esp(x.no.valor, k2), 0) / 2
      for (const sc of subs) {
        const t2 = esp(sc.no.valor, k2)
        const cor = corDo(c.no)
        fitas.push({
          id: `c:${sc.no.id}`,
          de: c.no.nome,
          para: sc.no.nome,
          x1: c.x + c.w - 2,
          t1: p2,
          x2: sc.x + 2,
          t2: meio(sc) - t2 / 2,
          espessura: t2,
          cor1: cor,
          cor2: cor,
          ligados: [c.no.id, sc.no.id],
          valor: sc.no.valor,
          fatia: sc.no.valor / Math.max(c.no.valor, 0.01),
          opacidade: intensidade(sc.no.valor / Math.max(c.no.valor, 0.01)),
          abre: { no: sc.no, pai: c.no },
        })
        p2 += t2
      }
    }

    return { W, H, caixas, centro, fitas }
  }, [fluxo, cores, corDo])

  const { W, H, caixas, centro, fitas } = desenho
  const escala = largura ? Math.min(1, Math.max(largura / W, ESCALA_MIN)) : 1
  const relacionados = useMemo(() => {
    if (!foco) return null
    return new Set(fitas.filter((f) => f.ligados.includes(foco)).flatMap((f) => f.ligados))
  }, [foco, fitas])
  const apagado = (id: string) => relacionados !== null && !relacionados.has(id)
  const baseReceita = fluxo.receitas > 0 ? fluxo.receitas : fluxo.total

  function mover(e: MouseEvent, f: Fita) {
    const r = externo.current?.getBoundingClientRect()
    if (!r) return
    setDica({
      x: Math.min(e.clientX - r.left + 14, r.width - 236),
      y: e.clientY - r.top + 14,
      texto: `${f.de} → ${f.para}`,
      valor: f.valor,
      base: `${porcento(f.fatia, 1)} ${f.id.startsWith('c:') ? 'da categoria' : f.id.startsWith('a:') ? 'do total' : 'da receita'}`,
    })
  }

  return (
    <div ref={externo} className="relative" onMouseLeave={() => (setFoco(null), setDica(null))}>
      <div className="overflow-x-auto sem-barra">
        <div className="mx-auto" style={{ width: W * escala, height: 22 * escala }}>
          <div
            aria-hidden
            className="relative origin-top-left text-[11px] font-semibold text-ink-muted"
            style={{ width: W, height: 22, transform: `scale(${escala})` }}
          >
            <span className="absolute" style={{ left: X0 }}>Entradas <span className="font-normal text-ink-faint">· % do total</span></span>
            <span className="absolute" style={{ left: X2 }}>Categorias <span className="font-normal text-ink-faint">· % da receita</span></span>
            {W > X3 && (
              <span className="absolute" style={{ left: X3 }}>
                Subcategorias <span className="font-normal text-ink-faint">· % da categoria</span>
              </span>
            )}
          </div>
        </div>
        <div className="mx-auto" style={{ width: W * escala, height: H * escala }}>
          <div className="relative origin-top-left" style={{ width: W, height: H, transform: `scale(${escala})` }}>
            <svg width={W} height={H} className="absolute inset-0" aria-hidden>
              <defs>
                {fitas.map((f, i) => (
                  <linearGradient key={f.id} id={`${prefixo}-g${i}`} gradientUnits="userSpaceOnUse" x1={f.x1} x2={f.x2} y1={0} y2={0}>
                    <stop offset="0%" stopColor={f.cor1} />
                    <stop offset="100%" stopColor={f.cor2} />
                  </linearGradient>
                ))}
              </defs>
              {fitas.map((f, i) => {
                const ativo = foco === null || f.ligados.includes(foco)
                return (
                  <path
                    key={f.id}
                    d={caminho(f)}
                    fill={`url(#${prefixo}-g${i})`}
                    fillOpacity={foco === null ? f.opacidade : ativo ? Math.min(f.opacidade + 0.2, 0.95) : 0.05}
                    style={{
                      transition: 'fill-opacity 160ms',
                      animation: `escurecer 700ms ease-out ${120 + i * 35}ms both`,
                      pointerEvents: 'all',
                      cursor: 'pointer',
                    }}
                    onClick={() => onAbrir(f.abre.no, f.abre.pai, corDo(f.abre.no, f.abre.pai))}
                    onMouseEnter={() => setFoco(f.ligados[f.ligados.length - 1] === 'centro' ? f.ligados[0] : f.ligados[1])}
                    onMouseMove={(e) => mover(e, f)}
                    onMouseLeave={() => setDica(null)}
                  />
                )
              })}
              {fitas.map((f) => {
                if (f.espessura < 15 || f.fatia < 0.05) return null
                const ativo = foco === null || f.ligados.includes(foco)
                const pct = f.fatia * 100
                return (
                  <text
                    key={`t:${f.id}`}
                    x={(f.x1 + f.x2) / 2}
                    y={(f.t1 + f.t2) / 2 + f.espessura / 2}
                    dy="0.35em"
                    textAnchor="middle"
                    fontSize={11.5}
                    fontWeight={800}
                    fill={cores.inkPrimary}
                    stroke={cores.surface}
                    strokeWidth={3.5}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                    pointerEvents="none"
                    opacity={ativo ? 1 : 0.15}
                    style={{ transition: 'opacity 160ms', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {pct >= 10 ? Math.round(pct) : pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                  </text>
                )
              })}
            </svg>

            {caixas.map((c, i) => (
              <Cartao
                key={c.no.id}
                caixa={c}
                cor={corDo(c.no, c.pai)}
                base={c.no.tipo === 'sub' ? (c.pai?.valor ?? 0) : c.x === X0 ? fluxo.total : baseReceita}
                apagado={apagado(c.no.id)}
                ordem={i}
                sinal={c.no.tipo === 'categoria' ? sinais?.get(c.no.nome) : undefined}
                onFoco={setFoco}
                onAbrir={() => onAbrir(c.no, c.pai, corDo(c.no, c.pai))}
              />
            ))}

            <div
              className={`animate-surgir absolute overflow-hidden rounded-3xl bg-panel text-panel-ink shadow-xl shadow-[#5b4cf0]/25 ring-1 ring-white/10 transition-opacity dark:shadow-none ${
                apagado('centro') ? 'opacity-40' : ''
              }`}
              style={{ left: centro.x, top: centro.y, width: centro.w, height: centro.h }}
              onMouseEnter={() => setFoco('centro')}
            >
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#6d5efc]/50 blur-2xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-accent/20 blur-2xl" />
              <div className="relative flex h-full flex-col items-center justify-center px-4 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffd36b] to-[#e8a10c] shadow-lg shadow-[#e8a10c]/30">
                  <Coins className="h-5 w-5 text-[#3a2600]" strokeWidth={2.2} />
                </span>
                <p className="mt-3 text-xs font-medium text-white/65">
                  {fluxo.entradas.some((e) => e.tipo === 'faltou') ? 'Movimentado no mês' : 'Receita do mês'}
                </p>
                <p className="mt-0.5 text-[1.6rem] font-bold leading-tight tracking-tight">{formatCurrency(fluxo.total)}</p>
                {fluxo.entradas.some((e) => e.tipo === 'faltou') && (
                  <p className="text-[11px] text-white/55">entrou {formatCurrency(fluxo.receitas)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {dica && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-30 w-[222px] rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl"
          style={{ left: dica.x, top: dica.y }}
        >
          <p className="font-medium text-ink">{dica.texto}</p>
          <p className="mt-0.5 text-ink-muted">
            <b className="font-semibold text-ink">{formatCurrency(dica.valor)}</b>
            {dica.base && ` · ${dica.base}`}
          </p>
          <p className="mt-1 text-[11px] text-ink-faint">Clique para ver os lançamentos</p>
        </div>
      )}
    </div>
  )
}

const ICONE: Partial<Record<NoFluxo['tipo'], LucideIcon>> = {
  receita: Briefcase,
  faltou: TriangleAlert,
  outras: Ellipsis,
  aLancar: CalendarClock,
  sobra: PiggyBank,
}

function Cartao({
  caixa,
  cor,
  base,
  apagado,
  ordem,
  sinal,
  onFoco,
  onAbrir,
}: {
  caixa: Caixa
  cor: string
  base: number
  apagado: boolean
  ordem: number
  sinal?: SinalCategoria
  onFoco: (id: string) => void
  onAbrir: () => void
}) {
  const { no, x, y, w, h, pai } = caixa
  const Icone = ICONE[no.tipo]
  const emojiProprio = emojiDaCategoria(no.nome)
  const emoji = emojiProprio === EMOJI_PADRAO && pai ? emojiDaCategoria(pai.nome) : emojiProprio
  const pequeno = no.tipo === 'sub'
  const destaque = no.tipo === 'sobra' || no.tipo === 'faltou'
  const alerta = sinal && sinal.nivel === 'critico'

  if (pequeno) {
    // o fundo do cartão é a própria barra: preenchido na proporção do peso na categoria
    const fatia = base > 0 ? Math.min(no.valor / base, 1) : 0
    const pct = fatia * 100
    const texto = pct >= 10 ? `${Math.round(pct)}%` : `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
    return (
      <div
        role="button"
        tabIndex={0}
        title={`${no.nome}: ${texto} de ${pai?.nome ?? 'a categoria'} · ver os lançamentos`}
        onClick={onAbrir}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onAbrir())}
        onFocus={() => onFoco(no.id)}
        onMouseEnter={() => onFoco(no.id)}
        className={`animate-surgir absolute flex cursor-pointer items-center overflow-hidden rounded-xl border bg-surface transition-[opacity,transform] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          apagado ? 'opacity-35' : ''
        }`}
        style={{
          left: x,
          top: y,
          width: w,
          height: h,
          animationDelay: `${ordem * 40}ms`,
          borderColor: `color-mix(in srgb, ${cor} 28%, var(--color-line))`,
        }}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0"
          style={{ width: `${pct}%`, background: `color-mix(in srgb, ${cor} 34%, transparent)`, transition: 'width 500ms ease-out' }}
        />
        <div className="relative min-w-0 flex-1 pl-3 pr-2">
          <p className="truncate text-[11px] font-medium text-ink-soft">{no.nome}</p>
          <p className="truncate text-[13px] font-bold tracking-tight text-ink">{formatCurrency(no.valor)}</p>
        </div>
        <span
          className={`relative shrink-0 pr-3 tabular-nums tracking-tight ${
            pct >= 25 ? 'text-base font-extrabold text-ink' : pct >= 10 ? 'text-sm font-bold text-ink-soft' : 'text-[13px] font-semibold text-ink-muted'
          }`}
        >
          {texto}
        </span>
      </div>
    )
  }

  const fatia = base > 0 ? Math.min(no.valor / base, 1) : 0
  const pct = fatia * 100
  const textoPct = pct >= 10 ? `${Math.round(pct)}%` : `${pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
  const rotuloBase = caixa.x === X0 ? 'do total' : 'da receita'
  const corSinal = sinal && sinal.nivel !== 'ok' ? ESTILO_NIVEL[sinal.nivel].texto : 'text-ink-muted'

  return (
    <div
      role="button"
      tabIndex={0}
      title={`${no.nome}: ${textoPct} ${rotuloBase} · ver os lançamentos`}
      onClick={onAbrir}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onAbrir())}
      onFocus={() => onFoco(no.id)}
      onMouseEnter={() => onFoco(no.id)}
      className={`animate-surgir absolute flex cursor-pointer items-center overflow-hidden rounded-2xl border bg-surface shadow-card transition-[opacity,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        apagado ? 'opacity-35' : ''
      } ${destaque || alerta ? 'border-2' : ''}`}
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        animationDelay: `${ordem * 40}ms`,
        borderColor: alerta
          ? `color-mix(in srgb, ${ESTILO_NIVEL.critico.borda} 75%, transparent)`
          : `color-mix(in srgb, ${cor} ${destaque ? 70 : 32}%, var(--color-line))`,
        boxShadow: alerta ? '0 0 0 4px color-mix(in srgb, var(--color-expense) 14%, transparent)' : undefined,
      }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0"
        style={{ width: `${pct}%`, background: `color-mix(in srgb, ${cor} 24%, transparent)`, transition: 'width 500ms ease-out' }}
      />
      <div className="relative flex h-full w-full items-center gap-3 px-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center text-[22px] leading-none">
          {Icone ? <Icone className="h-[22px] w-[22px]" style={{ color: cor }} strokeWidth={2.1} /> : emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-ink-soft">{no.nome}</p>
          <p className={`truncate font-bold tracking-tight text-ink ${no.tipo === 'receita' ? 'text-[17px]' : 'text-base'}`}>
            {formatCurrency(no.valor)}
          </p>
          {sinal && (
            <div className="mt-1.5">
              <BarraUso sinal={sinal} />
              <p className={`mt-1 truncate text-[11px] font-semibold ${corSinal}`} title={legendaDoSinal(sinal)}>
                {numeroDoSinal(sinal)} {sinal.tipoReferencia === 'orcamento' ? 'do orçamento' : 'vs. média'}
              </p>
            </div>
          )}
        </div>
        {base > 0 && (
          <span className="flex shrink-0 flex-col items-end leading-none tabular-nums">
            <span
              className={`tracking-tight text-ink ${
                pct >= 25 ? 'text-xl font-extrabold' : pct >= 10 ? 'text-lg font-bold' : 'text-base font-semibold text-ink-soft'
              }`}
            >
              {textoPct}
            </span>
            <span className="mt-1 text-[10px] font-medium text-ink-muted">{rotuloBase}</span>
          </span>
        )}
      </div>
    </div>
  )
}
