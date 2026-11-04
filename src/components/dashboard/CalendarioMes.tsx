import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import {
  CalendarDays,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  CalendarClock,
  Flame,
  Wallet,
  X,
} from 'lucide-react'
import type { Conta, Despesa, Entrada, Movimentacao } from '@/types/finance'
import type { Vencimento } from '@/lib/dashboardResumo'
import { calcularSaldo } from '@/lib/saldos'
import { formatCurrency, nomeBonito } from '@/lib/format'

const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const SEMANA_CURTA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const inteiro = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})
const compacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export interface GrupoCalendario {
  id: string
  nome: string
  cor: string
}

interface Props {
  periodo: string // YYYY-MM
  hoje: string // YYYY-MM-DD
  despesas: Despesa[]
  entradas: Entrada[]
  movimentacoes: Movimentacao[]
  vencimentos: Vencimento[] // do mês do período, ainda não pagos
  contaAutomatica?: Conta
  /** pedaços da barra "Para onde foi", com as mesmas cores */
  grupos: GrupoCalendario[]
  grupoDe: (d: Despesa) => string
}

type Modo = 'gastos' | 'saldo'

interface Dia {
  data: string
  numero: number
  semana: number // 0 = domingo
  despesas: Despesa[]
  entradas: Entrada[]
  vencimentos: Vencimento[]
  gasto: number
  recebido: number
  porGrupo: Map<string, number>
  saldo: { valor: number; previsto: boolean } | null
}

/**
 * Teto da escala de cor: o 85º percentil dos dias com valor. Um dia fora da curva
 * (aluguel, parcela) satura sozinho em vez de apagar o resto do mês.
 */
function tetoDaEscala(valores: number[]): number {
  const positivos = valores.filter((g) => g > 0).sort((a, b) => a - b)
  if (!positivos.length) return 1
  return positivos[Math.min(positivos.length - 1, Math.floor(positivos.length * 0.85))]
}

function misturar(cor: string, pct: number) {
  return `color-mix(in srgb, ${cor} ${Math.round(pct)}%, var(--color-surface))`
}

function Secao({
  icone,
  titulo,
  total,
  children,
}: {
  icone: ReactNode
  titulo: string
  total?: ReactNode
  children: ReactNode
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
          {icone}
          {titulo}
        </span>
        {total && <span className="text-[12px] font-semibold text-ink-soft">{total}</span>}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

/**
 * Calendário do mês. No modo Gastos o dia acende com o que saiu (e uma minibarra mostra
 * de quais categorias); no modo Saldo, com o saldo no fim do dia. Chips filtram por
 * categoria, o mouse mostra uma prévia e as setas do teclado andam pelos dias.
 */
export function CalendarioMes({
  periodo,
  hoje,
  despesas,
  entradas,
  movimentacoes,
  vencimentos,
  contaAutomatica,
  grupos,
  grupoDe,
}: Props) {
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [modo, setModo] = useState<Modo>('gastos')
  const [filtro, setFiltro] = useState<string | null>(null)
  const botoes = useRef(new Map<string, HTMLButtonElement>())

  const [ano, mes] = periodo.split('-').map(Number)
  const totalDias = new Date(ano, mes, 0).getDate()
  const ehMesAtual = hoje.slice(0, 7) === periodo
  const corDoGrupo = useMemo(() => new Map(grupos.map((g) => [g.id, g.cor])), [grupos])
  // filtro de outro mês (categoria que não existe mais aqui) é ignorado
  const filtroAtivo = filtro && corDoGrupo.has(filtro) ? filtro : null

  // trocar de mês volta a seleção pra hoje (ou dia 1) sem precisar de efeito
  const selecionado =
    escolhido && escolhido.startsWith(periodo) ? escolhido : ehMesAtual ? hoje : `${periodo}-01`

  const dias = useMemo(() => {
    const dados = { despesas, entradas, movimentacoes }
    const saldoHoje = contaAutomatica && ehMesAtual ? calcularSaldo(contaAutomatica, dados, hoje) : 0
    const lista: Dia[] = []
    for (let n = 1; n <= totalDias; n++) {
      const data = `${periodo}-${String(n).padStart(2, '0')}`
      const despesasDia = despesas.filter((d) => d.data.slice(0, 10) === data)
      const entradasDia = entradas.filter((e) => e.data.slice(0, 10) === data)
      const porGrupo = new Map<string, number>()
      for (const d of despesasDia) porGrupo.set(grupoDe(d), (porGrupo.get(grupoDe(d)) ?? 0) + d.valor)

      let saldo: Dia['saldo'] = null
      if (contaAutomatica) {
        if (data <= hoje) {
          saldo = { valor: calcularSaldo(contaAutomatica, dados, data), previsto: false }
        } else if (ehMesAtual) {
          // futuro do mês corrente: saldo de hoje + entradas previstas − contas a vencer
          const aReceber = entradas
            .filter(
              (e) =>
                e.status === 'PREVISTA' &&
                e.contaDestino === contaAutomatica.nome &&
                e.data.slice(0, 10) > hoje &&
                e.data.slice(0, 10) <= data
            )
            .reduce((s, e) => s + e.valor, 0)
          const aPagar = vencimentos.filter((v) => v.data <= data).reduce((s, v) => s + v.valor, 0)
          saldo = { valor: saldoHoje + aReceber - aPagar, previsto: true }
        }
      }

      lista.push({
        data,
        numero: n,
        semana: new Date(ano, mes - 1, n).getDay(),
        despesas: [...despesasDia].sort((a, b) => b.valor - a.valor),
        entradas: entradasDia,
        vencimentos: vencimentos.filter((v) => v.data === data),
        gasto: despesasDia.reduce((s, d) => s + d.valor, 0),
        recebido: entradasDia.reduce((s, e) => s + e.valor, 0),
        porGrupo,
        saldo,
      })
    }
    return lista
  }, [periodo, ano, mes, totalDias, hoje, ehMesAtual, despesas, entradas, movimentacoes, vencimentos, contaAutomatica, grupoDe])

  // semanas de domingo a sábado; posições antes do dia 1 e depois do último ficam vazias
  const semanas = useMemo(() => {
    const linhas: (Dia | null)[][] = []
    let linha: (Dia | null)[] = Array(dias[0]?.semana ?? 0).fill(null)
    for (const d of dias) {
      linha.push(d)
      if (linha.length === 7) {
        linhas.push(linha)
        linha = []
      }
    }
    if (linha.length) linhas.push([...linha, ...Array(7 - linha.length).fill(null)])
    return linhas
  }, [dias])

  const gastoDe = (d: Dia) => (filtroAtivo ? (d.porGrupo.get(filtroAtivo) ?? 0) : d.gasto)
  const tetoGasto = tetoDaEscala(dias.map(gastoDe))
  const saldosConhecidos = dias.flatMap((d) => (d.saldo ? [d.saldo.valor] : []))
  const tetoSaldo = Math.max(1, ...saldosConhecidos)
  const pisoSaldo = Math.min(0, ...saldosConhecidos)
  const maiorSemana = Math.max(1, ...semanas.map((l) => l.reduce((s, d) => s + (d ? gastoDe(d) : 0), 0)))

  const gastoNoMes = dias.reduce((s, d) => s + gastoDe(d), 0)
  const diasDecorridos = ehMesAtual ? Number(hoje.slice(8, 10)) : periodo < hoje ? totalDias : 0
  const mediaDiaria = diasDecorridos ? gastoNoMes / diasDecorridos : 0
  const diaMaisCaro = dias.reduce<Dia | null>(
    (maior, d) => (gastoDe(d) > (maior ? gastoDe(maior) : 0) ? d : maior),
    null
  )
  const nomeFiltro = grupos.find((g) => g.id === filtroAtivo)?.nome

  const dia = dias.find((d) => d.data === selecionado) ?? dias[0]
  const movimentoDia =
    dia.entradas.filter((e) => e.status === 'RECEBIDA').reduce((s, e) => s + e.valor, 0) - dia.gasto
  const vezesMedia = mediaDiaria > 0 && gastoDe(dia) > 0 ? gastoDe(dia) / mediaDiaria : null
  const aPagarDia = dia.vencimentos.reduce((s, v) => s + v.valor, 0)
  const despesasDoPainel = filtroAtivo
    ? dia.despesas.filter((d) => grupoDe(d) === filtroAtivo)
    : dia.despesas
  const vazio = !despesasDoPainel.length && !dia.entradas.length && !dia.vencimentos.length
  const nomeSemana = new Date(ano, mes - 1, dia.numero).toLocaleDateString('pt-BR', {
    weekday: 'long',
  })
  const nomeMes = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

  function selecionar(data: string, focar = false) {
    setEscolhido(data)
    if (focar) botoes.current.get(data)?.focus()
  }

  // setas andam um dia (← →) ou uma semana (↑ ↓), sem sair do mês
  function aoTeclar(e: KeyboardEvent) {
    const passo = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!passo) return
    e.preventDefault()
    const destino = Math.min(totalDias, Math.max(1, dia.numero + passo))
    selecionar(`${periodo}-${String(destino).padStart(2, '0')}`, true)
  }

  function fundoDoDia(x: Dia): string | undefined {
    if (modo === 'saldo') {
      if (!x.saldo) return undefined
      if (x.saldo.valor < 0) {
        return misturar('var(--color-expense)', 18 + Math.min(1, x.saldo.valor / (pisoSaldo || -1)) * 40)
      }
      return misturar('var(--color-brand)', 8 + Math.sqrt(x.saldo.valor / tetoSaldo) * 44)
    }
    const g = gastoDe(x)
    if (!g) return undefined
    const forca = Math.sqrt(Math.min(1, g / tetoGasto))
    const cor = filtroAtivo ? (corDoGrupo.get(filtroAtivo) ?? 'var(--color-brand)') : 'var(--color-brand)'
    return `linear-gradient(160deg, ${misturar(cor, 8 + forca * 34)}, ${misturar(cor, 14 + forca * 46)})`
  }

  return (
    <div>
      {/* modo, filtros e resumo */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-line bg-surface-2/60 p-0.5">
          {(['gastos', 'saldo'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={m === 'saldo' && !contaAutomatica}
              onClick={() => setModo(m)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all disabled:opacity-40 ${
                modo === m ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {m === 'gastos' ? <Receipt className="h-3.5 w-3.5" /> : <Wallet className="h-3.5 w-3.5" />}
              {m === 'gastos' ? 'Gastos' : 'Saldo'}
            </button>
          ))}
        </div>

        {ehMesAtual && selecionado !== hoje && (
          <button
            type="button"
            onClick={() => selecionar(hoje, true)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            Hoje
          </button>
        )}

        <div className="ml-auto flex flex-wrap gap-x-6 gap-y-1">
          <div>
            <p className="text-[11px] text-ink-faint">{nomeFiltro ? nomeFiltro : 'Gasto no mês'}</p>
            <p className="text-[15px] font-semibold tracking-tight text-ink">
              {formatCurrency(gastoNoMes)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-ink-faint">Média por dia</p>
            <p className="text-[15px] font-semibold tracking-tight text-ink">
              {mediaDiaria ? formatCurrency(mediaDiaria) : '—'}
            </p>
          </div>
          {diaMaisCaro && gastoDe(diaMaisCaro) > 0 && (
            <button
              type="button"
              onClick={() => selecionar(diaMaisCaro.data, true)}
              className="text-left group"
            >
              <p className="text-[11px] text-ink-faint">Dia mais caro</p>
              <p className="flex items-center gap-1 text-[15px] font-semibold tracking-tight text-ink group-hover:text-brand">
                <Flame className="h-3.5 w-3.5 text-[var(--color-serie-despesa)]" />
                {diaMaisCaro.numero}
                <span className="text-[12px] font-medium text-ink-faint">
                  · {inteiro.format(gastoDe(diaMaisCaro))}
                </span>
              </p>
            </button>
          )}
        </div>
      </div>

      {modo === 'gastos' && grupos.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {grupos.map((g) => {
            const ativo = filtroAtivo === g.id
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setFiltro(ativo ? null : g.id)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-all ${
                  ativo
                    ? 'text-ink shadow-sm'
                    : filtroAtivo
                      ? 'border-line text-ink-faint hover:text-ink'
                      : 'border-line text-ink-soft hover:border-ink-faint'
                }`}
                style={
                  ativo
                    ? { background: misturar(g.cor, 18), borderColor: g.cor }
                    : undefined
                }
              >
                <span className="h-2 w-2 rounded-full" style={{ background: g.cor }} />
                {g.nome}
                {ativo && <X className="h-3 w-3 text-ink-muted" />}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div onKeyDown={aoTeclar}>
          <div className="grid grid-cols-7 md:grid-cols-[repeat(7,minmax(0,1fr))_72px] gap-2 mb-2">
            {SEMANA.map((s, i) => (
              <span
                key={s}
                className={`text-center text-[11px] font-medium ${i === 0 || i === 6 ? 'text-ink-faint/70' : 'text-ink-faint'}`}
              >
                <span className="sm:hidden">{SEMANA_CURTA[i]}</span>
                <span className="hidden sm:inline">{s}</span>
              </span>
            ))}
            <span className="hidden md:block text-right text-[11px] font-medium text-ink-faint">
              {modo === 'gastos' ? 'Semana' : ''}
            </span>
          </div>

          <div className="space-y-2">
            {semanas.map((linha, i) => {
              const totalSemana = linha.reduce((s, d) => s + (d ? gastoDe(d) : 0), 0)
              return (
                <div
                  key={i}
                  className="grid grid-cols-7 md:grid-cols-[repeat(7,minmax(0,1fr))_72px] gap-2"
                >
                  {linha.map((x, j) => {
                    if (!x) return <span key={`v-${i}-${j}`} />
                    const passado = x.data <= hoje
                    const ehHoje = x.data === hoje
                    const ativo = x.data === selecionado
                    const gasto = gastoDe(x)
                    const apagado = filtroAtivo !== null && gasto === 0
                    const vencido = x.vencimentos.some((v) => v.vencido)
                    const valorAVencer = x.vencimentos
                      .filter((v) => !v.vencido)
                      .reduce((s, v) => s + v.valor, 0)
                    const fundo = fundoDoDia(x)
                    const segmentosDia = [...x.porGrupo.entries()].sort((a, b) => b[1] - a[1])
                    // a prévia abre pra baixo nas duas primeiras semanas, pra não sair do card
                    const previaAbaixo = i < 2

                    return (
                      <button
                        key={x.data}
                        ref={(el) => {
                          if (el) botoes.current.set(x.data, el)
                          else botoes.current.delete(x.data)
                        }}
                        type="button"
                        onClick={() => selecionar(x.data)}
                        aria-label={`Dia ${x.numero}`}
                        aria-pressed={ativo}
                        tabIndex={ativo ? 0 : -1}
                        style={fundo ? { backgroundImage: fundo } : undefined}
                        className={`group relative flex h-14 sm:h-[82px] flex-col justify-between rounded-2xl p-1.5 sm:p-2.5 text-left transition-all duration-150 focus-visible:outline-none ${
                          fundo
                            ? ''
                            : passado
                              ? 'bg-surface-2/50'
                              : 'border border-dashed border-line bg-transparent'
                        } ${apagado ? 'opacity-35' : ''} ${
                          ativo
                            ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface shadow-lg shadow-brand/20'
                            : 'hover:z-20 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10 focus-visible:ring-2 focus-visible:ring-brand/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span
                            className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-full text-[12px] font-semibold ${
                              ehHoje
                                ? 'bg-brand px-1.5 text-white shadow-sm shadow-brand/40'
                                : passado
                                  ? 'text-ink'
                                  : 'text-ink-faint'
                            }`}
                          >
                            {x.numero}
                          </span>
                          {x.recebido > 0 ? (
                            <>
                              <span className="hidden sm:block pt-0.5 text-[10px] font-semibold text-income">
                                +{compacto.format(x.recebido).replace('R$', '').trim()}
                              </span>
                              <span className="sm:hidden mt-1 h-1.5 w-1.5 rounded-full bg-income" />
                            </>
                          ) : (
                            vencido && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-expense" />
                          )}
                        </div>

                        <div className="hidden sm:block">
                          {modo === 'saldo' ? (
                            x.saldo && (
                              <span
                                className={`block truncate text-[12px] font-semibold ${x.saldo.valor < 0 ? 'text-expense' : 'text-ink-soft'}`}
                              >
                                {inteiro.format(x.saldo.valor)}
                                {x.saldo.previsto && (
                                  <span className="ml-0.5 text-[9px] font-medium text-ink-faint">prev.</span>
                                )}
                              </span>
                            )
                          ) : gasto > 0 ? (
                            <>
                              <span className="block truncate text-[12px] font-semibold text-ink-soft">
                                {inteiro.format(gasto)}
                              </span>
                              {/* de quais categorias foi o gasto do dia */}
                              {!filtroAtivo && (
                                <span className="mt-1 flex h-1 gap-px overflow-hidden rounded-full">
                                  {segmentosDia.map(([grupo, valor]) => (
                                    <span
                                      key={grupo}
                                      className="h-full"
                                      style={{
                                        width: `${(valor / x.gasto) * 100}%`,
                                        background: corDoGrupo.get(grupo) ?? 'var(--color-ink-faint)',
                                      }}
                                    />
                                  ))}
                                </span>
                              )}
                            </>
                          ) : valorAVencer > 0 ? (
                            <span className="flex items-center gap-1 truncate text-[11px] font-semibold text-[var(--color-serie-despesa)]">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-serie-despesa)]" />
                              {inteiro.format(valorAVencer)}
                            </span>
                          ) : null}
                        </div>

                        {/* no celular, um pontinho coral marca conta a vencer */}
                        {valorAVencer > 0 && (
                          <span className="sm:hidden absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-serie-despesa)]" />
                        )}

                        {/* prévia ao passar o mouse */}
                        {(x.despesas.length > 0 || x.vencimentos.length > 0 || x.entradas.length > 0) && (
                          <span
                            className={`pointer-events-none absolute left-1/2 z-30 hidden w-56 -translate-x-1/2 rounded-xl border border-line bg-surface p-3 text-left opacity-0 shadow-pop transition-opacity duration-150 sm:block group-hover:opacity-100 ${
                              previaAbaixo ? 'top-full mt-2' : 'bottom-full mb-2'
                            }`}
                          >
                            <span className="flex items-center justify-between text-[11px] text-ink-faint">
                              <span>
                                {SEMANA[x.semana]}, {x.numero}
                              </span>
                              {x.gasto > 0 && (
                                <span className="font-semibold text-ink">{formatCurrency(x.gasto)}</span>
                              )}
                            </span>
                            {x.despesas.slice(0, 3).map((d) => (
                              <span key={d.id} className="mt-1.5 flex items-center gap-2 text-[12px]">
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ background: corDoGrupo.get(grupoDe(d)) ?? 'var(--color-ink-faint)' }}
                                />
                                <span className="min-w-0 flex-1 truncate text-ink-soft">{d.descricao}</span>
                                <span className="shrink-0 font-medium text-ink">{inteiro.format(d.valor)}</span>
                              </span>
                            ))}
                            {x.despesas.length > 3 && (
                              <span className="mt-1 block text-[11px] text-ink-faint">
                                + {x.despesas.length - 3} outra(s)
                              </span>
                            )}
                            {x.vencimentos.length > 0 && (
                              <span className="mt-1.5 block text-[11px] text-[var(--color-serie-despesa)]">
                                {x.vencimentos.length} conta(s) a pagar · {inteiro.format(x.vencimentos.reduce((s, v) => s + v.valor, 0))}
                              </span>
                            )}
                            {x.recebido > 0 && (
                              <span className="mt-1 block text-[11px] text-income">
                                Entrada de {formatCurrency(x.recebido)}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    )
                  })}

                  <span className="hidden md:flex flex-col items-end justify-center pr-0.5">
                    {modo === 'gastos' && totalSemana > 0 && (
                      <>
                        <span className="text-[12px] font-semibold text-ink-soft">
                          {compacto.format(totalSemana)}
                        </span>
                        <span className="mt-1 h-1 w-full max-w-[56px] overflow-hidden rounded-full bg-surface-2">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${(totalSemana / maiorSemana) * 100}%`,
                              background: filtroAtivo
                                ? corDoGrupo.get(filtroAtivo)
                                : 'color-mix(in srgb, var(--color-brand) 70%, transparent)',
                            }}
                          />
                        </span>
                      </>
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-muted">
            {modo === 'gastos' ? (
              <span className="flex items-center gap-2">
                Menos
                <span className="flex gap-1">
                  {[0.15, 0.4, 0.7, 1].map((f) => (
                    <span
                      key={f}
                      className="h-3 w-3 rounded-[4px]"
                      style={{
                        background: misturar(
                          filtroAtivo ? (corDoGrupo.get(filtroAtivo) ?? 'var(--color-brand)') : 'var(--color-brand)',
                          14 + f * 46
                        ),
                      }}
                    />
                  ))}
                </span>
                Mais gasto
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-[4px]" style={{ background: misturar('var(--color-expense)', 45) }} />
                Negativo
                <span className="flex gap-1">
                  {[0.1, 0.4, 1].map((f) => (
                    <span
                      key={f}
                      className="h-3 w-3 rounded-[4px]"
                      style={{ background: misturar('var(--color-brand)', 8 + Math.sqrt(f) * 44) }}
                    />
                  ))}
                </span>
                Saldo mais alto
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-income">+1,2 mil</span> entrada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-serie-despesa)]" /> a vencer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-expense" /> vencido
            </span>
            <span className="ml-auto hidden lg:inline text-ink-faint">← → ↑ ↓ pra navegar</span>
          </div>
        </div>

        {/* detalhe do dia selecionado; a key reinicia a animação ao trocar de dia */}
        <aside key={dia.data} className="animate-surgir flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <span className="text-[44px] font-semibold leading-none tracking-[-0.04em] text-ink">
              {dia.numero}
            </span>
            <div className="pb-1 leading-tight">
              <p className="text-[13px] font-semibold text-ink first-letter:uppercase">{nomeSemana}</p>
              <p className="text-[12px] text-ink-faint">
                {nomeMes} {ano}
              </p>
            </div>
            {dia.data === hoje && (
              <span className="mb-1.5 ml-auto rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                Hoje
              </span>
            )}
            {dia.data > hoje && (
              <span className="mb-1.5 ml-auto rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
                Em breve
              </span>
            )}
          </div>

          {dia.saldo && (
            <div className="relative overflow-hidden rounded-2xl bg-panel p-4 text-panel-ink shadow-lg shadow-[#5b4cf0]/15 dark:shadow-none">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#6d5efc]/45 blur-2xl"
              />
              <div className="relative">
                <p className="text-[11px] text-white/55">
                  Saldo no fim do dia{dia.saldo.previsto ? ' · previsto' : ''}
                </p>
                <p
                  className={`mt-1 text-[26px] font-semibold leading-tight tracking-[-0.03em] ${dia.saldo.valor < 0 ? 'text-[#ff8a8f]' : ''}`}
                >
                  {formatCurrency(dia.saldo.valor)}
                </p>
                {dia.saldo.previsto ? (
                  <p className="mt-1 text-[11px] text-white/45">
                    Com entradas previstas e contas a vencer, sem os gastos do dia a dia
                  </p>
                ) : (
                  (movimentoDia !== 0 || dia.gasto > 0) && (
                    <p className="mt-1.5 flex items-center gap-1 text-[12px] text-white/60">
                      {movimentoDia >= 0 ? (
                        <ArrowDownLeft className="h-3.5 w-3.5 text-accent" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-[#ff8a8f]" />
                      )}
                      {movimentoDia >= 0 ? '+' : ''}
                      {formatCurrency(movimentoDia)} no dia
                    </p>
                  )
                )}
              </div>
            </div>
          )}

          {vezesMedia !== null && (
            <p className="flex items-center gap-2 rounded-xl bg-surface-2/70 px-3 py-2 text-[12px] text-ink-muted">
              <Flame
                className={`h-3.5 w-3.5 shrink-0 ${vezesMedia >= 1.5 ? 'text-[var(--color-serie-despesa)]' : 'text-ink-faint'}`}
              />
              {vezesMedia >= 1.15 ? (
                <span>
                  <b className="font-semibold text-ink">{vezesMedia.toFixed(1).replace('.', ',')}×</b>{' '}
                  {nomeFiltro ? `a média diária de ${nomeFiltro}` : 'a sua média diária'}
                </span>
              ) : vezesMedia <= 0.85 ? (
                <span>
                  Abaixo da média diária (
                  <b className="font-semibold text-ink">{formatCurrency(mediaDiaria)}</b>)
                </span>
              ) : (
                <span>Na sua média diária</span>
              )}
            </p>
          )}

          {vazio ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-10 text-center">
              <CalendarDays className="h-5 w-5 text-ink-faint" />
              <p className="text-[12px] text-ink-faint">
                {filtroAtivo ? `Nada de ${nomeFiltro} neste dia` : 'Nenhum movimento neste dia'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {dia.vencimentos.length > 0 && (
                <Secao
                  icone={<CalendarClock className="h-3.5 w-3.5" />}
                  titulo="A pagar"
                  total={formatCurrency(aPagarDia)}
                >
                  {dia.vencimentos.map((v) => (
                    <div
                      key={v.id}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2/60"
                    >
                      <span
                        className={`h-8 w-1 shrink-0 rounded-full ${v.vencido ? 'bg-expense' : 'bg-[var(--color-serie-despesa)]'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink">{v.descricao}</p>
                        <p className={`text-[11px] ${v.vencido ? 'text-expense' : 'text-ink-faint'}`}>
                          {v.vencido ? 'Vencido' : v.detalhe}
                        </p>
                      </div>
                      <span className="shrink-0 text-[13px] font-semibold text-ink">
                        {formatCurrency(v.valor)}
                      </span>
                    </div>
                  ))}
                </Secao>
              )}

              {dia.entradas.length > 0 && (
                <Secao
                  icone={<ArrowDownLeft className="h-3.5 w-3.5" />}
                  titulo="Entradas"
                  total={<span className="text-income">+{formatCurrency(dia.recebido)}</span>}
                >
                  {dia.entradas.map((e) => (
                    <div
                      key={e.id}
                      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2/60"
                    >
                      <span className="h-8 w-1 shrink-0 rounded-full bg-income" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink">{e.descricao}</p>
                        <p className="text-[11px] text-ink-faint">
                          {e.status === 'PREVISTA' ? 'Prevista' : 'Recebida'}
                          {e.categoria && ` · ${nomeBonito(e.categoria)}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-[13px] font-semibold text-income">
                        +{formatCurrency(e.valor)}
                      </span>
                    </div>
                  ))}
                </Secao>
              )}

              {despesasDoPainel.length > 0 && (
                <Secao
                  icone={<Receipt className="h-3.5 w-3.5" />}
                  titulo={`${nomeFiltro ?? 'Despesas'} · ${despesasDoPainel.length}`}
                  total={formatCurrency(despesasDoPainel.reduce((s, d) => s + d.valor, 0))}
                >
                  <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
                    {despesasDoPainel.map((x) => {
                      const cor = corDoGrupo.get(grupoDe(x)) ?? 'var(--color-ink-faint)'
                      return (
                        <div key={x.id} className="-mx-2 rounded-xl px-2 py-1.5 hover:bg-surface-2/60">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: cor }} />
                              <div className="min-w-0">
                                <p className="truncate text-[13px] text-ink">{x.descricao}</p>
                                <p className="truncate text-[11px] text-ink-faint">
                                  {nomeBonito(x.categoria)}
                                  {x.subcategoria && ` · ${nomeBonito(x.subcategoria)}`}
                                </p>
                              </div>
                            </div>
                            <span className="shrink-0 text-[13px] font-semibold text-ink">
                              {formatCurrency(x.valor)}
                            </span>
                          </div>
                          {/* quanto essa despesa pesa no total do dia */}
                          <div className="mt-1.5 ml-4 h-1 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(x.valor / dia.gasto) * 100}%`, background: cor, opacity: 0.7 }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Secao>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
