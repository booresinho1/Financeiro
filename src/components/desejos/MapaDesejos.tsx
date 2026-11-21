import { useId, useMemo, useState } from 'react'
import { useChartColors } from '@/lib/chartTheme'
import { classeDe, limitesDoMapa, type Analise, type ClasseDesejo, type Desejo, type Veredito } from '@/lib/desejos'
import { formatCurrency } from '@/lib/format'
import { FotoDesejo } from './FotoDesejo'
import { nf, pctCofrinho, textoVeredito } from './DetalhesDesejo'

const L = 980
const A = 420
const M = { e: 30, d: 20, c: 14, b: 40 }
const LETRA = 6.3 // largura média de um caractere em 11px

interface Bolha {
  d: Desejo
  x: number
  y: number
  r: number
}

interface Rotulo {
  x: number
  y: number
  anchor: 'start' | 'middle' | 'end'
}

const curto = (nome: string) => (nome.length > 22 ? `${nome.slice(0, 21)}…` : nome)

/** Afasta bolhas que caíram uma em cima da outra, sem tirá-las muito do lugar. */
function separar(bolhas: Bolha[], xMin: number, xMax: number, yMin: number, yMax: number, xMeio: number, yMeio: number) {
  // o centro de cada bolha não sai do quadrante onde ela nasceu
  const caixa = new Map(
    bolhas.map((b) => [
      b.d.id,
      { x1: b.x < xMeio ? xMin : xMeio + 2, x2: b.x < xMeio ? xMeio - 2 : xMax, y1: b.y < yMeio ? yMin : yMeio + 2, y2: b.y < yMeio ? yMeio - 2 : yMax },
    ])
  )
  for (let it = 0; it < 60; it++) {
    let mexeu = false
    for (let i = 0; i < bolhas.length; i++)
      for (let j = i + 1; j < bolhas.length; j++) {
        const a = bolhas[i]
        const b = bolhas[j]
        const dx = b.x - a.x || 0.01 * (j - i)
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)
        const min = a.r + b.r + 4
        if (dist < min) {
          const empurra = (min - dist) / 2
          const ux = dx / (dist || 1)
          const uy = dy / (dist || 1)
          a.x -= ux * empurra
          a.y -= uy * empurra
          b.x += ux * empurra
          b.y += uy * empurra
          mexeu = true
        }
      }
    for (const b of bolhas) {
      const q = caixa.get(b.d.id)!
      b.x = Math.min(Math.max(b.x, xMin + b.r, q.x1), xMax - b.r, q.x2)
      b.y = Math.min(Math.max(b.y, yMin + b.r, q.y1), yMax - b.r, q.y2)
    }
    if (!mexeu) break
  }
}

/** Escolhe para cada nome um lugar (em cima, embaixo, à direita, à esquerda) que não bata em outro nome nem em bolha. */
function posicionarRotulos(bolhas: Bolha[]): Map<string, Rotulo | null> {
  const caixas: { x1: number; y1: number; x2: number; y2: number }[] = []
  const bate = (c: (typeof caixas)[number]) =>
    c.x1 < M.e || c.x2 > L - M.d ||
    caixas.some((o) => c.x1 < o.x2 && c.x2 > o.x1 && c.y1 < o.y2 && c.y2 > o.y1) ||
    bolhas.some((b) => {
      const px = Math.max(c.x1, Math.min(b.x, c.x2))
      const py = Math.max(c.y1, Math.min(b.y, c.y2))
      return Math.hypot(px - b.x, py - b.y) < b.r - 1
    })
  const saida = new Map<string, Rotulo | null>()
  // as maiores primeiro: ficam com o melhor lugar
  for (const b of [...bolhas].sort((p, q) => q.r - p.r)) {
    const w = curto(b.d.nome).length * LETRA
    const opcoes: Rotulo[] = [
      { x: b.x, y: b.y - b.r - 6, anchor: 'middle' },
      { x: b.x, y: b.y + b.r + 14, anchor: 'middle' },
      { x: b.x + b.r + 6, y: b.y + 4, anchor: 'start' },
      { x: b.x - b.r - 6, y: b.y + 4, anchor: 'end' },
    ]
    let escolhido: Rotulo | null = null
    for (const o of opcoes) {
      const x1 = o.anchor === 'middle' ? o.x - w / 2 : o.anchor === 'start' ? o.x : o.x - w
      const caixa = { x1: x1 - 2, y1: o.y - 11, x2: x1 + w + 2, y2: o.y + 3 }
      if (!bate(caixa)) {
        caixas.push(caixa)
        escolhido = o
        break
      }
    }
    saida.set(b.d.id, escolhido)
  }
  return saida
}

/** Cartão que aparece sobre a bolha com o mouse: foto grande, preço e quando cabe. */
function CartaoFoco({ bolha, a, v, cls }: { bolha: Bolha; a: Analise; v?: Veredito; cls: ClasseDesejo }) {
  const { d, x, y, r } = bolha
  const vt = v ? textoVeredito(v) : null
  const pct = v ? pctCofrinho(d, v) : 0
  // abre do lado com mais espaço: à direita da bolha na metade esquerda, à esquerda na direita
  const direita = x < L / 2
  const emCima = y > A * 0.55
  return (
    <div
      className="pointer-events-none absolute z-20 w-60 rounded-2xl border border-line bg-surface p-3 shadow-2xl shadow-black/25"
      style={{
        left: `${((direita ? x + r + 10 : x - r - 10) / L) * 100}%`,
        top: `${(y / A) * 100}%`,
        transform: `translate(${direita ? '0' : '-100%'}, ${emCima ? '-85%' : '-15%'})`,
      }}
    >
      <FotoDesejo imagem={d.imagem} emoji={cls.emoji} tamanho={120} className="mx-auto mb-2 flex rounded-xl" />
      <p className="text-sm font-bold leading-tight text-ink">{d.nome}</p>
      <p className="text-[11px] text-ink-muted">
        {cls.emoji} {cls.nome} · {nf(a.diasSalario)} dias de salário
      </p>
      <p className="mt-1.5 text-xl font-extrabold tabular-nums text-ink">
        {formatCurrency(d.valor)}
        {d.tipo === 'MENSAL' && <span className="text-xs font-bold text-ink-muted">/mês</span>}
      </p>
      {vt && (
        <div className="mt-1.5">
          <div className="flex items-baseline justify-between text-[11px] font-bold">
            <span className={vt.classe}>{vt.texto}</span>
            {d.tipo === 'UNICO' && <span style={{ color: vt.cor }}>{nf(pct, 0)}%</span>}
          </div>
          {d.tipo === 'UNICO' && (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: vt.cor }} />
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-[10.5px] text-ink-faint">clique para ver tudo e simular</p>
    </div>
  )
}

/** Importância (vertical) × custo em dias de salário (horizontal). Tamanho da bolha = preço. */
export function MapaDesejos({
  desejos,
  analises,
  veredito,
  classes,
  onAbrir,
}: {
  desejos: Desejo[]
  analises: Map<string, Analise>
  veredito: Map<string, Veredito>
  classes: ClasseDesejo[]
  onAbrir: (id: string) => void
}) {
  const cores = useChartColors()
  const [foco, setFoco] = useState<string | null>(null)
  // fotos que não carregaram voltam para o emoji
  const [semFoto, setSemFoto] = useState<Set<string>>(new Set())
  const idSvg = useId().replace(/:/g, '')
  const indiceClasse = (id: string) => Math.max(classes.findIndex((c) => c.id === id), 0)
  const corDa = (d: Desejo) => cores.composicao[indiceClasse(d.classe) % 5]

  const limites = limitesDoMapa(desejos, analises)
  const { maxDias, maxImp } = limites
  const maxValor = Math.max(...desejos.map((d) => d.valor), 1)
  const minValor = Math.min(...desejos.map((d) => d.valor), maxValor)
  // raiz do preço: o desejo de R$ 40 mil não esmaga a escala dos de R$ 300
  const raio = (v: number) => 11 + (Math.sqrt(v) / Math.sqrt(maxValor)) * 21
  const folga = raio(maxValor) + 6
  const escalaX = (dias: number) => M.e + folga + (Math.sqrt(dias) / Math.sqrt(maxDias)) * (L - M.e - M.d - folga * 2)
  const escalaY = (imp: number) => A - M.b - folga - (imp / maxImp) * (A - M.b - M.c - folga * 2)

  const xMeio = escalaX(limites.corteDias)
  const yMeio = escalaY(limites.corteImp)
  const marcas = [1, 3, 10, 30, 90].filter((m) => m < maxDias)

  const { bolhas, rotulos } = useMemo(() => {
    const bs: Bolha[] = desejos.map((d) => {
      const a = analises.get(d.id)!
      return { d, x: escalaX(a.diasSalario), y: escalaY(a.importancia), r: raio(d.valor) }
    })
    separar(bs, M.e, L - M.d, M.c, A - M.b, xMeio, yMeio)
    return { bolhas: bs, rotulos: posicionarRotulos(bs) }
  }, [desejos, analises]) // eslint-disable-line react-hooks/exhaustive-deps

  const quadros = [
    { x: M.e, y: M.c, w: xMeio - M.e, h: yMeio - M.c, cor: cores.income, titulo: 'Faça já', nota: 'importa muito, custa pouco', canto: 'tl' },
    { x: xMeio, y: M.c, w: L - M.d - xMeio, h: yMeio - M.c, cor: cores.brand, titulo: 'Planeje', nota: 'importa muito, custa muito', canto: 'tr' },
    { x: M.e, y: yMeio, w: xMeio - M.e, h: A - M.b - yMeio, cor: cores.inkMuted, titulo: 'Se sobrar', nota: 'importa pouco, custa pouco', canto: 'bl' },
    { x: xMeio, y: yMeio, w: L - M.d - xMeio, h: A - M.b - yMeio, cor: 'var(--color-warning)', titulo: 'Pense bem', nota: 'importa pouco, custa muito', canto: 'br' },
  ] as const

  const classesUsadas = classes.filter((c) => desejos.some((d) => d.classe === c.id))
  const ativoId = foco
  const bolhaFoco = foco ? bolhas.find((b) => b.d.id === foco) : undefined

  return (
    <div>
      <div className="relative">
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full" role="img" aria-label="Mapa dos desejos: importância contra custo em dias de salário; o tamanho da bolha é o preço">
        {quadros.map((q) => {
          const direita = q.canto === 'tr' || q.canto === 'br'
          const baixo = q.canto === 'bl' || q.canto === 'br'
          const tx = direita ? q.x + q.w - 12 : q.x + 12
          const ty = baixo ? q.y + q.h - 24 : q.y + 22
          return (
            <g key={q.titulo}>
              <rect x={q.x + 2} y={q.y + 2} width={Math.max(q.w - 4, 0)} height={Math.max(q.h - 4, 0)} rx={12} style={{ fill: q.cor }} opacity={0.07} />
              <text x={tx} y={ty} textAnchor={direita ? 'end' : 'start'} fontSize={13} fontWeight={800} style={{ fill: q.cor }}>
                {q.titulo}
              </text>
              <text x={tx} y={ty + 14} textAnchor={direita ? 'end' : 'start'} fontSize={10.5} fill={cores.inkMuted}>
                {q.nota}
              </text>
            </g>
          )
        })}

        {marcas.map((m) => (
          <text key={m} x={escalaX(m)} y={A - M.b + 16} textAnchor="middle" fontSize={11} fill={cores.inkMuted}>
            {m}d
          </text>
        ))}
        <text x={(M.e + L - M.d) / 2} y={A - 6} textAnchor="middle" fontSize={11} fill={cores.inkMuted}>
          custo em dias de salário →
        </text>
        <text x={12} y={(M.c + A - M.b) / 2} textAnchor="middle" fontSize={11} fill={cores.inkMuted} transform={`rotate(-90 12 ${(M.c + A - M.b) / 2})`}>
          importância →
        </text>

        {bolhas.map(({ d, x, y, r }) => {
          const ativo = ativoId === d.id
          const apagado = ativoId && !ativo
          const cor = corDa(d)
          const comFoto = !!d.imagem && !semFoto.has(d.id)
          const clip = `${idSvg}-${d.id}`
          return (
            <g
              key={d.id}
              role="button"
              tabIndex={0}
              aria-label={`${d.nome}: abrir detalhes`}
              style={{ cursor: 'pointer', opacity: apagado ? 0.25 : 1, transition: 'opacity 150ms', outline: 'none' }}
              onMouseEnter={() => setFoco(d.id)}
              onMouseLeave={() => setFoco(null)}
              onFocus={() => setFoco(d.id)}
              onBlur={() => setFoco(null)}
              onClick={() => onAbrir(d.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onAbrir(d.id))}
            >
              {comFoto ? (
                <>
                  <clipPath id={clip}>
                    <circle cx={x} cy={y} r={r - 1} />
                  </clipPath>
                  <circle cx={x} cy={y} r={r} fill="#ffffff" />
                  <image
                    href={d.imagem}
                    x={x - r}
                    y={y - r}
                    width={r * 2}
                    height={r * 2}
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${clip})`}
                    onError={() => setSemFoto((s) => new Set(s).add(d.id))}
                  />
                  <circle cx={x} cy={y} r={r} fill="none" stroke={cor} strokeWidth={ativo ? 3.5 : 2.5} strokeDasharray={d.tipo === 'MENSAL' ? '5 4' : undefined} />
                </>
              ) : (
                <>
                  <circle cx={x} cy={y} r={r} fill={cor} fillOpacity={d.tipo === 'MENSAL' ? 0.18 : 0.3} stroke={cor} strokeWidth={ativo ? 3 : 2} strokeDasharray={d.tipo === 'MENSAL' ? '5 4' : undefined} />
                  <text x={x} y={y + r * 0.32} textAnchor="middle" fontSize={Math.max(r * 0.9, 12)} pointerEvents="none">
                    {classeDe(d.classe, classes).emoji}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* nomes por cima de tudo, cada um no lugar livre que achou */}
        {bolhas.map(({ d }) => {
          const pos = rotulos.get(d.id)
          // com o mouse em cima, o cartão já mostra o nome
          if (!pos || ativoId) return null
          return (
            <text key={`r-${d.id}`} pointerEvents="none" x={pos.x} y={pos.y} textAnchor={pos.anchor} fontSize={11} fontWeight={700} fill={cores.inkPrimary} stroke={cores.surface} strokeWidth={3} paintOrder="stroke">
              {curto(d.nome)}
            </text>
          )
        })}
      </svg>

      {bolhaFoco && <CartaoFoco bolha={bolhaFoco} a={analises.get(bolhaFoco.d.id)!} v={veredito.get(bolhaFoco.d.id)} cls={classeDe(bolhaFoco.d.classe, classes)} />}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[11px] text-ink-muted">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {classesUsadas.map((c) => (
            <span key={c.id} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: cores.composicao[indiceClasse(c.id) % 5] }} />
              {c.nome}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span>tamanho = preço</span>
          <span className="flex items-end gap-2">
            {[minValor, maxValor].filter((v, i, arr) => arr.indexOf(v) === i).map((v) => (
              <span key={v} className="flex items-center gap-1">
                <span className="rounded-full border-2 border-ink-faint" style={{ width: (raio(v) / 32) * 26, height: (raio(v) / 32) * 26 }} />
                {formatCurrency(v).replace(/,00$/, '')}
              </span>
            ))}
          </span>
          {desejos.some((d) => d.tipo === 'MENSAL') && (
            <span className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-full border-2 border-dashed border-ink-faint" /> mensal
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
