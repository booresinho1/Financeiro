import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarClock, Gauge, Target, Wind, type LucideIcon } from 'lucide-react'
import { SaldoDiaADia } from '@/components/inicio/SaldoDiaADia'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Caixa } from '@/lib/inicio'

// cores sobre o painel escuro, que é o mesmo nos dois temas
const COR_FATURA = '#8b80ff'
const COR_PARCELAS = '#e8643c'
const COR_FIXOS = '#3987e5'

export type CliqueCaixa = 'saldo' | 'entradas' | 'fatura' | 'parcelas' | 'fixos' | 'sobra'

function diaMes(iso: string): string {
  return formatDate(iso).slice(0, 5)
}

function splitMoeda(valorFormatado: string): [string, string] {
  const idx = valorFormatado.lastIndexOf(',')
  if (idx === -1) return [valorFormatado, '']
  return [valorFormatado.slice(0, idx), valorFormatado.slice(idx + 1)]
}

function LinhaDaConta({
  sinal,
  rotulo,
  nota,
  valor,
  onClick,
  children,
}: {
  sinal: string
  rotulo: string
  nota?: string
  valor: number
  onClick?: () => void
  children?: ReactNode
}) {
  const conteudo = (
    <span className="flex items-baseline gap-2.5">
      <span className="w-3 shrink-0 text-center text-sm font-semibold text-white/40">{sinal}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-white/75">
        {rotulo}
        {nota && <span className="ml-1.5 text-[11px] text-white/40">{nota}</span>}
      </span>
      <span className="shrink-0 text-base font-semibold text-white">{formatCurrency(valor)}</span>
    </span>
  )
  return (
    <div className="rounded-xl px-2.5 py-2">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="block w-full rounded-md text-left transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {conteudo}
        </button>
      ) : (
        conteudo
      )}
      {children}
    </div>
  )
}

const TOM_DO_INDICADOR = {
  bom: 'text-accent',
  atencao: 'text-[#f5b341]',
  ruim: 'text-[#ff8a8f]',
  neutro: 'text-white/50',
}

function Indicador({
  icone: Icone,
  rotulo,
  valor,
  nota,
  tom,
}: {
  icone: LucideIcon
  rotulo: string
  valor: string
  nota: string
  tom: keyof typeof TOM_DO_INDICADOR
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="flex items-center gap-1.5 text-[11px] text-white/55">
        <Icone className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{rotulo}</span>
      </p>
      <p className="mt-1.5 truncate text-base font-semibold tracking-tight text-white sm:text-lg">
        {valor}
      </p>
      <p className={`mt-0.5 text-[11px] leading-snug ${TOM_DO_INDICADOR[tom]}`}>{nota}</p>
    </div>
  )
}

function PartesDaSaida({ caixa, onClique }: { caixa: Caixa; onClique: (c: CliqueCaixa) => void }) {
  const partes: { id: CliqueCaixa; rotulo: string; nota: string; valor: number; cor: string }[] = [
    ...(caixa.origemSaldo === 'banco'
      ? [
          {
            id: 'fatura' as const,
            rotulo: 'Fatura',
            nota: caixa.faturaVencimento ? `~${diaMes(caixa.faturaVencimento)}` : '',
            valor: caixa.fatura,
            cor: COR_FATURA,
          },
        ]
      : []),
    {
      id: 'parcelas',
      rotulo: 'Parcelas',
      nota: String(caixa.parcelas.length),
      valor: caixa.totalParcelas,
      cor: COR_PARCELAS,
    },
    {
      id: 'fixos',
      rotulo: 'Custos fixos',
      nota: String(caixa.fixos.length),
      valor: caixa.totalFixos,
      cor: COR_FIXOS,
    },
  ]
  const comValor = partes.filter((p) => p.valor > 0)
  if (!comValor.length) return null

  return (
    <div className="mt-2 pl-[22px]">
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {comValor.map((p) => (
          <span
            key={p.id}
            className="h-full"
            style={{ flexGrow: p.valor, flexBasis: 0, background: p.cor }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-1 gap-y-0.5">
        {comValor.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onClique(p.id)}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <i className="h-2 w-2 rounded-sm" style={{ background: p.cor }} />
            {p.rotulo}
            {p.nota && <span className="text-white/40">{p.nota}</span>}
            <b className="font-semibold text-white">{formatCurrency(p.valor)}</b>
          </button>
        ))}
      </div>
    </div>
  )
}

export function PainelCaixa({
  caixa,
  hoje,
  carregando,
  avisos,
  onClique,
}: {
  caixa: Caixa
  hoje: string
  carregando: boolean
  avisos: string[]
  onClique: (c: CliqueCaixa) => void
}) {
  const faltando = caixa.sobra < 0
  const [inteiro, centavos] = splitMoeda(formatCurrency(caixa.sobra))
  const proximaEntrada = caixa.previstas.find((e) => e.data.slice(0, 10) >= hoje)
  const gastaAcima = !faltando && caixa.gastoDiario > caixa.porDia
  const acimaDoLimite =
    caixa.porDia > 0 ? Math.round((caixa.gastoDiario / caixa.porDia - 1) * 100) : 0
  const entradasDoMes = caixa.previstas.length

  if (!carregando && caixa.contas.length === 0) {
    return (
      <section className="animate-surgir rounded-3xl bg-panel p-6 md:p-7 text-panel-ink">
        <p className="text-xs font-medium text-white/60">Posso gastar?</p>
        <p className="mt-3 text-lg font-semibold">Falta cadastrar a sua conta do dia a dia</p>
        <p className="mt-1 max-w-md text-sm text-white/60">
          Crie uma conta do tipo Automática para ver quanto sobra no mês e quantos dias de fôlego você
          tem.
        </p>
        <Link
          to="/contas"
          className="mt-4 inline-flex items-center gap-1 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-[#0e1016]"
        >
          Criar conta
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
    )
  }

  return (
    <section className="animate-surgir relative overflow-hidden rounded-3xl bg-panel p-5 md:p-7 text-panel-ink shadow-xl shadow-[#5b4cf0]/20 dark:shadow-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#6d5efc]/45 blur-3xl"
      />
      {faltando && (
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-expense/20 blur-3xl"
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />

      {carregando ? (
        <div className="relative space-y-4">
          <p className="text-xs font-medium text-white/60">Posso gastar?</p>
          <div className="h-[3.4rem] w-64 max-w-full animate-pulse rounded-xl bg-white/10" />
          <div className="h-[208px] animate-pulse rounded-xl bg-white/[0.06]" />
        </div>
      ) : (
        <div className="relative">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <p className="text-xs font-medium text-white/60">Posso gastar?</p>
              <button
                type="button"
                onClick={() => onClique('sobra')}
                title="Ver a conta completa"
                className="mt-3 block max-w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <span
                  className={`block truncate text-[2.6rem] sm:text-[3.4rem] leading-none font-semibold tracking-[-0.045em] ${faltando ? 'text-[#ff8a8f]' : ''}`}
                >
                  {inteiro}
                  {centavos && (
                    <span className="text-[1.7rem] sm:text-[2.2rem] opacity-40">,{centavos}</span>
                  )}
                </span>
              </button>
              <p className="mt-2 text-sm text-white/60">
                {faltando
                  ? 'é o que falta para fechar o mês, depois de tudo que entra e sai'
                  : `para o dia a dia até ${diaMes(caixa.fimDoMes)}, com as contas do mês já descontadas`}
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Indicador
                  icone={Target}
                  rotulo="Dá para gastar"
                  valor={formatCurrency(caixa.porDia)}
                  nota={faltando ? 'sem folga no mês' : `por dia até ${diaMes(caixa.fimDoMes)}`}
                  tom={faltando ? 'ruim' : 'bom'}
                />
                <Indicador
                  icone={Gauge}
                  rotulo="Você gasta"
                  valor={caixa.gastoDiario > 0 ? formatCurrency(caixa.gastoDiario) : '—'}
                  nota={
                    caixa.gastoDiario <= 0
                      ? 'sem histórico ainda'
                      : faltando
                        ? 'por dia'
                        : gastaAcima
                          ? `${acimaDoLimite}% acima do limite`
                          : 'dentro do limite'
                  }
                  tom={caixa.gastoDiario <= 0 ? 'neutro' : faltando || gastaAcima ? 'atencao' : 'bom'}
                />
                <Indicador
                  icone={Wind}
                  rotulo="Fôlego"
                  valor={caixa.folegoDias === null ? '—' : `${caixa.folegoDias} dia(s)`}
                  nota={
                    !caixa.acabaEm
                      ? 'sem histórico ainda'
                      : caixa.acabaEm <= caixa.fimDoMes
                        ? `até ${diaMes(caixa.acabaEm)}`
                        : 'passa do fim do mês'
                  }
                  tom={
                    caixa.folegoDias === null
                      ? 'neutro'
                      : caixa.faltaNoRitmo
                        ? 'atencao'
                        : 'bom'
                  }
                />
              </div>

              {caixa.totalPrevistas > 0 && (
                <p className="mt-3 flex items-start gap-2 text-xs text-white/55">
                  <CalendarClock className="mt-px h-3.5 w-3.5 shrink-0 text-white/40" />
                  <span>
                    Inclui {formatCurrency(caixa.totalPrevistas)} que ainda vão entrar. Sem eles,{' '}
                    {caixa.livre < 0 ? (
                      <>
                        faltariam{' '}
                        <b className="font-semibold text-[#ff8a8f]">{formatCurrency(-caixa.livre)}</b>
                      </>
                    ) : (
                      <>
                        sobrariam{' '}
                        <b className="font-semibold text-white">{formatCurrency(caixa.livre)}</b>
                      </>
                    )}
                  </span>
                </p>
              )}

              {avisos.map((a) => (
                <p key={a} className="mt-3 text-[11px] text-[#f5b341]">
                  {a}
                </p>
              ))}
            </div>

            <div className="lg:col-span-6">
              <div className="mb-1 flex items-center justify-between gap-2 px-2.5">
                <p className="text-xs font-medium text-white/60">A conta</p>
                {caixa.origemSaldo === 'banco' && (
                  <Link
                    to="/cartao"
                    className="flex items-center gap-0.5 text-[11px] font-medium text-white/50 hover:text-white"
                  >
                    Cartão <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <LinhaDaConta
                sinal=""
                rotulo="Tem hoje"
                nota={caixa.origemSaldo === 'app' ? 'pelos lançamentos' : 'nas contas'}
                valor={caixa.saldo}
                onClick={() => onClique('saldo')}
              />
              <LinhaDaConta
                sinal="+"
                rotulo="Vai entrar"
                nota={
                  proximaEntrada
                    ? `${entradasDoMes > 1 ? `${entradasDoMes} entradas, próxima` : 'em'} ${diaMes(proximaEntrada.data)}`
                    : undefined
                }
                valor={caixa.totalPrevistas}
                onClick={() => onClique('entradas')}
              />
              <LinhaDaConta sinal="−" rotulo="Vai sair" valor={caixa.comprometido}>
                <PartesDaSaida caixa={caixa} onClique={onClique} />
              </LinhaDaConta>
              <button
                type="button"
                onClick={() => onClique('sobra')}
                className="mt-1 flex w-full items-baseline gap-2.5 rounded-xl bg-white/[0.06] px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <span className="w-3 shrink-0 text-center text-sm font-semibold text-white/40">=</span>
                <span className="flex-1 text-sm font-medium text-white">
                  {faltando ? 'Falta' : 'Sobra'}
                </span>
                <span
                  className={`text-lg font-semibold ${faltando ? 'text-[#ff8a8f]' : 'text-accent'}`}
                >
                  {formatCurrency(Math.abs(caixa.sobra))}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <p className="text-sm font-medium text-white">Saldo dia a dia</p>
                <span className="flex items-center gap-1.5 text-[11px] text-white/55">
                  <i className="h-0.5 w-4 rounded-full bg-accent" />
                  só as contas
                </span>
                {caixa.gastoDiario > 0 && (
                  <span className="flex items-center gap-1.5 text-[11px] text-white/55">
                    <i className="h-0 w-4 border-t-[1.5px] border-dashed border-white/60" />
                    no seu ritmo de gasto
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60">
                {caixa.pior.saldo < 0 ? (
                  <>
                    Só com as contas, chega a{' '}
                    <b className="font-semibold text-[#ff8a8f]">{formatCurrency(caixa.pior.saldo)}</b>{' '}
                    em {diaMes(caixa.pior.data)}
                  </>
                ) : caixa.faltaNoRitmo ? (
                  <>
                    No seu ritmo, falta dinheiro em{' '}
                    <b className="font-semibold text-[#ff8a8f]">{diaMes(caixa.faltaNoRitmo.data)}</b>{' '}
                    ({formatCurrency(caixa.faltaNoRitmo.noRitmo)})
                  </>
                ) : caixa.gastoDiario > 0 ? (
                  <>
                    No seu ritmo, fecha o mês com{' '}
                    <b className="font-semibold text-accent">
                      {formatCurrency(caixa.pontos[caixa.pontos.length - 1].noRitmo)}
                    </b>
                  </>
                ) : null}
              </p>
            </div>
            <SaldoDiaADia pontos={caixa.pontos} />
            {caixa.gastoDiario > 0 && (
              <p className="mt-1 text-[11px] text-white/40">
                A linha tracejada desconta sua média diária. Compra no crédito só sai na fatura
                seguinte, então esse é o cenário mais apertado.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
