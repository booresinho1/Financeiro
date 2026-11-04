import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, Landmark, PiggyBank, Plus } from 'lucide-react'
import { emojiDaCategoria } from '@/lib/emojiCategoria'
import { formatCurrency, nomeBonito } from '@/lib/format'
import type { LinhaOrcamento, ResumoOrcamentos, SituacaoOrcamento } from '@/lib/inicio'

const TAMANHO = 112
const ESPESSURA = 11
const RAIO = (TAMANHO - ESPESSURA) / 2
const CIRCUNFERENCIA = 2 * Math.PI * RAIO

const ESTILO: Record<SituacaoOrcamento, { traco: string; texto: string; selo: string; rotulo: string }> = {
  folga: {
    traco: 'var(--color-income)',
    texto: 'text-income',
    selo: 'bg-income-soft text-income',
    rotulo: '✅ Dentro do ritmo',
  },
  atencao: {
    traco: 'var(--color-warning)',
    texto: 'text-warning',
    selo: 'bg-warning-soft text-warning',
    rotulo: '⚠️ Atenção',
  },
  estourou: {
    traco: 'var(--color-expense)',
    texto: 'text-expense',
    selo: 'bg-expense-soft text-expense',
    rotulo: '🚨 Estourou',
  },
}

function Anel({
  linha,
  emoji,
  fracaoDoMes,
}: {
  linha: LinhaOrcamento
  emoji: string
  fracaoDoMes: number
}) {
  const estilo = ESTILO[linha.situacao]
  const preenchido = Math.min(linha.percentual, 100) / 100
  const anguloHoje = fracaoDoMes * 360 - 90
  const radianos = (anguloHoje * Math.PI) / 180
  const centro = TAMANHO / 2
  const externo = RAIO + ESPESSURA / 2 + 1
  const interno = RAIO - ESPESSURA / 2 - 1

  return (
    <div className="relative shrink-0" style={{ width: TAMANHO, height: TAMANHO }}>
      <svg width={TAMANHO} height={TAMANHO} viewBox={`0 0 ${TAMANHO} ${TAMANHO}`} aria-hidden>
        <circle
          cx={centro}
          cy={centro}
          r={RAIO}
          fill="none"
          stroke={`color-mix(in srgb, ${estilo.traco} 16%, transparent)`}
          strokeWidth={ESPESSURA}
        />
        <circle
          cx={centro}
          cy={centro}
          r={RAIO}
          fill="none"
          stroke={estilo.traco}
          strokeWidth={ESPESSURA}
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={CIRCUNFERENCIA * (1 - preenchido)}
          transform={`rotate(-90 ${centro} ${centro})`}
          className="transition-[stroke-dashoffset] duration-700"
        />
        {fracaoDoMes > 0 && fracaoDoMes < 1 && (
          <line
            x1={centro + interno * Math.cos(radianos)}
            y1={centro + interno * Math.sin(radianos)}
            x2={centro + externo * Math.cos(radianos)}
            y2={centro + externo * Math.sin(radianos)}
            stroke="var(--color-ink)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[30px] leading-none" aria-hidden>
          {emoji}
        </span>
        <span className={`mt-1 text-[11px] font-semibold ${estilo.texto}`}>
          {linha.percentual.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

function CardOrcamento({
  linha,
  fracaoDoMes,
  ordem,
  onClick,
}: {
  linha: LinhaOrcamento
  fracaoDoMes: number
  ordem: number
  onClick: () => void
}) {
  const estilo = ESTILO[linha.situacao]
  const nome = nomeBonito(linha.subcategoria || linha.categoria)
  const semGasto = linha.gasto === 0
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        animationDelay: `${ordem * 50}ms`,
        backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${estilo.traco} 10%, transparent), transparent 60%)`,
      }}
      className="animate-surgir group flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <Anel linha={linha} emoji={emojiDaCategoria(linha.subcategoria || linha.categoria)} fracaoDoMes={fracaoDoMes} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink" title={nome}>
          {nome}
        </span>
        {linha.subcategoria && (
          <span className="block truncate text-[11px] text-ink-faint">
            {nomeBonito(linha.categoria)}
          </span>
        )}
        <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <b className={`text-xl font-bold tracking-tight ${estilo.texto}`}>
            {formatCurrency(Math.abs(linha.resta))}
          </b>
          <span className="text-[11px] text-ink-faint">{linha.resta < 0 ? 'acima' : 'restam'}</span>
        </span>
        <span className="block text-xs text-ink-muted">
          {formatCurrency(linha.gasto)} de {formatCurrency(linha.orcado)}
        </span>
        <span
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            semGasto ? 'bg-surface-2 text-ink-muted' : estilo.selo
          }`}
        >
          {semGasto ? '✨ Sem gasto ainda' : estilo.rotulo}
        </span>
        {linha.projecao !== null && linha.situacao !== 'estourou' && !semGasto && (
          <span className="mt-1 block truncate text-[11px] text-ink-faint">
            No ritmo, fecha em {formatCurrency(linha.projecao)}
          </span>
        )}
      </span>
    </button>
  )
}

function BarraGeral({ resumo }: { resumo: ResumoOrcamentos }) {
  const percentual = resumo.orcado > 0 ? (resumo.gasto / resumo.orcado) * 100 : 0
  const estourou = percentual > 100
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div>
          <p className="text-xs text-ink-muted">Ainda cabe no orçamento</p>
          <p className="text-3xl font-semibold tracking-tight text-ink">
            {formatCurrency(resumo.resta)}
          </p>
        </div>
        <p className="text-xs text-ink-muted">
          {formatCurrency(resumo.gasto)} gastos de {formatCurrency(resumo.orcado)}
        </p>
      </div>
      <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${estourou ? 'bg-expense' : 'bg-brand'}`}
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
        {resumo.fracaoDoMes > 0 && resumo.fracaoDoMes < 1 && (
          <span
            title="Onde o mês está hoje"
            className="absolute inset-y-0 w-0.5 bg-ink"
            style={{ left: `${resumo.fracaoDoMes * 100}%` }}
          />
        )}
      </div>
      {resumo.fracaoDoMes > 0 && resumo.fracaoDoMes < 1 && (
        <p className="mt-1.5 text-[11px] text-ink-faint">
          O traço escuro marca onde o mês está hoje: {(resumo.fracaoDoMes * 100).toFixed(0)}% já passou.
        </p>
      )}
    </div>
  )
}

export function PainelOrcamentos({
  resumo,
  sobraDoMes,
  comprasNaFila,
  navegacaoMes,
  onSelecionar,
}: {
  resumo: ResumoOrcamentos
  /** só no mês corrente: compara o que o orçamento permite com o que o caixa aguenta */
  sobraDoMes: number | null
  comprasNaFila: { quantidade: number; valor: number }
  navegacaoMes: ReactNode
  onSelecionar: (l: LinhaOrcamento) => void
}) {
  const semLastro = sobraDoMes !== null && resumo.resta > 0 && resumo.resta > sobraDoMes

  return (
    <section
      style={{ animationDelay: '60ms' }}
      className="animate-surgir rounded-2xl border border-line bg-surface p-5 shadow-card dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <PiggyBank className="h-4 w-4" strokeWidth={2.1} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-ink">Orçamento por categoria</h3>
            <p className="mt-0.5 text-xs text-ink-faint">
              Conta na data da compra. Clique numa categoria para ver os lançamentos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {navegacaoMes}
          <Link
            to="/orcamentos"
            className="flex items-center gap-1 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover"
          >
            <Plus className="h-3.5 w-3.5" />
            Definir
          </Link>
        </div>
      </div>

      {resumo.linhas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
          <PiggyBank className="mx-auto h-8 w-8 text-ink-faint" />
          <p className="mt-3 text-sm font-semibold text-ink">Nenhum orçamento definido ainda</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-ink-muted">
            Defina quanto quer gastar por mês em cada categoria. Cada uma vira um anel aqui, com o
            quanto ainda pode gastar.
          </p>
          <Link
            to="/orcamentos"
            className="mt-4 inline-flex items-center gap-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Criar meus orçamentos
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <BarraGeral resumo={resumo} />

          {semLastro && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-2.5 text-xs text-ink-soft">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p>
                O orçamento ainda permite <b className="font-semibold">{formatCurrency(resumo.resta)}</b>
                ,{' '}
                {sobraDoMes! > 0 ? (
                  <>
                    mas só sobram <b className="font-semibold">{formatCurrency(sobraDoMes!)}</b> até o
                    fim do mês.
                  </>
                ) : (
                  <>
                    mas já faltam <b className="font-semibold">{formatCurrency(-sobraDoMes!)}</b> para
                    fechar o mês.
                  </>
                )}
              </p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {resumo.linhas.map((l, i) => (
              <CardOrcamento
                key={l.id}
                linha={l}
                fracaoDoMes={resumo.fracaoDoMes}
                ordem={i}
                onClick={() => onSelecionar(l)}
              />
            ))}
          </div>
        </>
      )}

      {comprasNaFila.quantidade > 0 && (
        <Link
          to="/bancos"
          className="mt-4 flex items-center gap-2 rounded-xl bg-surface-2/70 px-3.5 py-2.5 text-xs text-ink-soft transition-colors hover:bg-surface-2"
        >
          <Landmark className="h-4 w-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            {comprasNaFila.quantidade} compra(s) do banco ainda sem lançar, somando{' '}
            <b className="font-semibold">{formatCurrency(comprasNaFila.valor)}</b>. Até conciliar, elas
            ficam fora do orçamento.
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
        </Link>
      )}

      {resumo.semOrcamento.length > 0 && (
        <div className="mt-4 border-t border-line-soft pt-3">
          <p className="mb-2 text-[11px] font-medium text-ink-muted">Gasto sem orçamento definido</p>
          <div className="flex flex-wrap gap-1.5">
            {resumo.semOrcamento.map((s) => (
              <Link
                key={s.categoria}
                to="/orcamentos"
                className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink-soft transition-colors hover:border-brand/50 hover:text-brand"
              >
                {emojiDaCategoria(s.categoria)} {nomeBonito(s.categoria)} ·{' '}
                <b className="font-semibold">{formatCurrency(s.gasto)}</b>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
