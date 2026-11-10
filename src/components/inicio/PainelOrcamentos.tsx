import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowUpRight, Landmark, PiggyBank, Plus } from 'lucide-react'
import { emojiDaCategoria } from '@/lib/emojiCategoria'
import { formatCurrency, nomeBonito } from '@/lib/format'
import type { LinhaOrcamento, ResumoOrcamentos, SituacaoOrcamento } from '@/lib/inicio'

const ESTILO: Record<SituacaoOrcamento, { cor: string; texto: string; rotulo: string }> = {
  folga: { cor: 'var(--color-income)', texto: 'text-income', rotulo: 'No ritmo' },
  atencao: { cor: 'var(--color-warning)', texto: 'text-warning', rotulo: 'Atenção' },
  estourou: { cor: 'var(--color-expense)', texto: 'text-expense', rotulo: 'Estourou' },
}

function pct(v: number): string {
  return `${v >= 10 ? Math.round(v) : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

/**
 * Uma categoria por linha: a barra mostra o que já foi gasto (cheio), o que o ritmo atual ainda
 * deve gastar (claro) e o que passou do orçado (vermelho). O traço grosso é o orçado; o fino, onde o
 * gasto deveria estar hoje.
 */
function LinhaCategoria({
  linha,
  fracaoDoMes,
  onClick,
}: {
  linha: LinhaOrcamento
  fracaoDoMes: number
  onClick: () => void
}) {
  const estilo = ESTILO[linha.situacao]
  const nome = nomeBonito(linha.subcategoria || linha.categoria)
  const semGasto = linha.gasto === 0
  const projecao = linha.projecao !== null && linha.projecao > linha.gasto ? linha.projecao : null
  const escala = Math.max(linha.orcado, linha.gasto, projecao ?? 0) * 1.03
  const pos = (v: number) => `${(v / escala) * 100}%`
  const dentro = Math.min(linha.gasto, linha.orcado)
  const excesso = Math.max(linha.gasto - linha.orcado, 0)
  const hoje = fracaoDoMes > 0 && fracaoDoMes < 1 ? linha.orcado * fracaoDoMes : null

  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid w-full grid-cols-[minmax(0,130px)_1fr_auto] items-center gap-3 border-b border-line-soft px-1 py-2 text-left transition-colors hover:bg-surface-2/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:grid-cols-[132px_1fr_124px] sm:gap-3"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="text-lg leading-none" aria-hidden>
          {emojiDaCategoria(linha.subcategoria || linha.categoria)}
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold leading-tight text-ink" title={nome}>
            {nome}
          </span>
          {linha.subcategoria && <span className="block truncate text-[11px] text-ink-faint">{nomeBonito(linha.categoria)}</span>}
        </span>
      </span>

      <span className="block">
        <span className="relative block h-3 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.07]">
          {projecao !== null && (
            <span
              className="absolute inset-y-0 rounded-full"
              style={{ left: 0, width: pos(projecao), background: `color-mix(in srgb, ${estilo.cor} 24%, transparent)` }}
            />
          )}
          <span
            className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
            style={{ width: pos(dentro), background: estilo.cor }}
          />
          {excesso > 0 && (
            <span
              className="absolute inset-y-0 rounded-r-full bg-expense"
              style={{ left: pos(linha.orcado), width: pos(excesso) }}
            />
          )}
          {hoje !== null && (
            <span aria-hidden title="Onde o gasto deveria estar hoje" className="absolute inset-y-0 w-px bg-ink/45" style={{ left: pos(hoje) }} />
          )}
          <span aria-hidden className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `calc(${pos(linha.orcado)} - 1px)` }} />
        </span>
        <span className="mt-1 flex justify-between gap-2 whitespace-nowrap text-[11px] text-ink-muted tabular-nums">
          <span>
            <b className="font-semibold text-ink-soft">{formatCurrency(linha.gasto)}</b> de {formatCurrency(linha.orcado)}
          </span>
          {projecao !== null && linha.situacao !== 'estourou' && (
            <span className={projecao > linha.orcado ? 'font-semibold text-warning' : ''}>fecha {formatCurrency(projecao)}</span>
          )}
        </span>
      </span>

      <span className="text-right leading-tight">
        <span className={`block whitespace-nowrap text-[15px] font-extrabold tracking-tight tabular-nums ${semGasto ? 'text-ink-soft' : estilo.texto}`}>
          {linha.resta < 0 ? '+' : ''}
          {formatCurrency(Math.abs(linha.resta))}
          <span className="ml-1 text-[10px] font-medium text-ink-muted">{linha.resta < 0 ? 'acima' : 'restam'}</span>
        </span>
        <span className={`block whitespace-nowrap text-[11px] font-semibold ${semGasto ? 'text-ink-faint' : estilo.texto}`}>
          {semGasto ? 'sem gasto ainda' : `${pct(linha.percentual)} usado · ${estilo.rotulo}`}
        </span>
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
            Defina quanto quer gastar por mês em cada categoria. Cada uma vira uma barra aqui, com o
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

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-full bg-ink/25" /> gasto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-full bg-ink/10" /> onde o ritmo leva
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-0.5 bg-ink" /> orçado
            </span>
            {resumo.fracaoDoMes > 0 && resumo.fracaoDoMes < 1 && (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-px bg-ink/45" /> onde deveria estar hoje
              </span>
            )}
          </div>

          <div className="mt-1 grid grid-cols-1 gap-x-8 xl:grid-cols-2">
            {resumo.linhas.map((l) => (
              <LinhaCategoria key={l.id} linha={l} fracaoDoMes={resumo.fracaoDoMes} onClick={() => onSelecionar(l)} />
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
