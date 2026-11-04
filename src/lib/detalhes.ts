import { somarMeses } from '@/lib/datas'
import { formatCurrency } from '@/lib/format'
import type { Vencimento } from '@/lib/dashboardResumo'
import type { Trajetoria } from '@/lib/ritmo'
import type { Despesa, Entrada } from '@/types/finance'

/** Conteúdo de um modal de detalhe: números-resumo, histórico, divisão e a lista por trás. */
export interface Detalhe {
  titulo: string
  subtitulo: string
  cor: string
  estatisticas: { rotulo: string; valor: string; nota?: string; tom?: 'bom' | 'ruim' }[]
  historico?: { mes: string; valor: number }[]
  historicoTitulo?: string
  divisao?: { nome: string; valor: number }[]
  divisaoTitulo?: string
  /** rótulo do total quando a divisão é uma conta que soma e subtrai */
  divisaoTotalTitulo?: string
  itens: { id: string; data: string; titulo: string; subtitulo?: string; valor: number; tom?: 'entrada' | 'alerta' }[]
  itensTitulo: string
}

const MESES_HISTORICO = 6
const MESES_MEDIA = 3
const MAX_DIVISAO = 6

function mesesAte(periodo: string, quantos: number): string[] {
  return Array.from({ length: quantos }, (_, i) =>
    somarMeses(`${periodo}-01`, i - (quantos - 1)).slice(0, 7)
  )
}

function pct(parte: number, todo: number): string {
  return todo > 0 ? `${((parte / todo) * 100).toFixed(0)}%` : '—'
}

/** Variação contra a média dos meses anteriores; "maior = ruim" pra gasto, "maior = bom" pra renda. */
function comparacao(atual: number, anteriores: number[], maiorEhBom: boolean) {
  const media = anteriores.reduce((a, b) => a + b, 0) / Math.max(anteriores.length, 1)
  if (!media) return { valor: '—', nota: 'sem meses anteriores', tom: undefined }
  const variacao = (atual - media) / Math.abs(media)
  const sinal = variacao > 0 ? '+' : ''
  const subiu = variacao > 0.05
  const caiu = variacao < -0.05
  return {
    valor: `${sinal}${(variacao * 100).toFixed(0)}%`,
    nota: `média ${formatCurrency(media)}`,
    tom: subiu ? (maiorEhBom ? 'bom' : 'ruim') : caiu ? (maiorEhBom ? 'ruim' : 'bom') : undefined,
  } as const
}

function agrupar<T>(itens: T[], chave: (x: T) => string, valor: (x: T) => number) {
  const mapa = new Map<string, number>()
  for (const x of itens) mapa.set(chave(x), (mapa.get(chave(x)) ?? 0) + valor(x))
  const ordenado = [...mapa.entries()].sort((a, b) => b[1] - a[1])
  const topo = ordenado.slice(0, MAX_DIVISAO).map(([nome, v]) => ({ nome, valor: v }))
  const resto = ordenado.slice(MAX_DIVISAO).reduce((s, [, v]) => s + v, 0)
  return resto > 0 ? [...topo, { nome: 'Outros', valor: resto }] : topo
}

interface ParamsDespesas {
  titulo: string
  cor: string
  despesas: Despesa[]
  periodo: string
  filtro: (d: Despesa) => boolean
  agruparPor: (d: Despesa) => string
  divisaoTitulo: string
  totalSaiu: number
}

export function detalheDespesas(p: ParamsDespesas): Detalhe {
  const doGrupo = p.despesas.filter(p.filtro)
  const doMes = doGrupo.filter((d) => d.data.slice(0, 7) === p.periodo)
  const total = doMes.reduce((s, d) => s + d.valor, 0)
  const historico = mesesAte(p.periodo, MESES_HISTORICO).map((mes) => ({
    mes,
    valor: doGrupo.filter((d) => d.data.slice(0, 7) === mes).reduce((s, d) => s + d.valor, 0),
  }))
  const anteriores = historico.slice(-1 - MESES_MEDIA, -1).map((h) => h.valor)
  const comp = comparacao(total, anteriores, false)
  const maior = doMes.reduce<Despesa | null>((m, d) => (d.valor > (m?.valor ?? 0) ? d : m), null)

  return {
    titulo: p.titulo,
    subtitulo: `${doMes.length} lançamento(s) no mês`,
    cor: p.cor,
    estatisticas: [
      { rotulo: 'Total no mês', valor: formatCurrency(total) },
      { rotulo: 'Do que saiu', valor: pct(total, p.totalSaiu) },
      {
        rotulo: 'Por lançamento',
        valor: doMes.length ? formatCurrency(total / doMes.length) : '—',
        nota: maior ? `maior ${formatCurrency(maior.valor)}` : undefined,
      },
      { rotulo: `vs. ${MESES_MEDIA} meses antes`, ...comp },
    ],
    historico,
    historicoTitulo: `Últimos ${MESES_HISTORICO} meses`,
    divisao: agrupar(doMes, p.agruparPor, (d) => d.valor),
    divisaoTitulo: p.divisaoTitulo,
    itens: [...doMes]
      .sort((a, b) => b.valor - a.valor)
      .map((d) => ({
        id: d.id,
        data: d.data,
        titulo: d.descricao,
        subtitulo: [d.categoria, d.subcategoria].filter(Boolean).join(' · '),
        valor: d.valor,
      })),
    itensTitulo: 'Lançamentos, do maior pro menor',
  }
}

export function detalheEntradas(entradas: Entrada[], periodo: string, cor: string): Detalhe {
  const doMes = entradas.filter((e) => e.data.slice(0, 7) === periodo)
  const recebidas = doMes.filter((e) => e.status === 'RECEBIDA')
  const previstas = doMes.filter((e) => e.status === 'PREVISTA')
  const total = recebidas.reduce((s, e) => s + e.valor, 0)
  const historico = mesesAte(periodo, MESES_HISTORICO).map((mes) => ({
    mes,
    valor: entradas
      .filter((e) => e.status === 'RECEBIDA' && e.data.slice(0, 7) === mes)
      .reduce((s, e) => s + e.valor, 0),
  }))
  const comp = comparacao(total, historico.slice(-1 - MESES_MEDIA, -1).map((h) => h.valor), true)

  return {
    titulo: 'Entradas',
    subtitulo: `${recebidas.length} recebida(s), ${previstas.length} prevista(s)`,
    cor,
    estatisticas: [
      { rotulo: 'Recebido', valor: formatCurrency(total) },
      {
        rotulo: 'Ainda previsto',
        valor: formatCurrency(previstas.reduce((s, e) => s + e.valor, 0)),
      },
      {
        rotulo: 'Maior entrada',
        valor: recebidas.length ? formatCurrency(Math.max(...recebidas.map((e) => e.valor))) : '—',
      },
      { rotulo: `vs. ${MESES_MEDIA} meses antes`, ...comp },
    ],
    historico,
    historicoTitulo: `Recebido nos últimos ${MESES_HISTORICO} meses`,
    divisao: agrupar(doMes, (e) => e.categoria || 'Sem categoria', (e) => e.valor),
    divisaoTitulo: 'Por categoria',
    itens: [...doMes]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((e) => ({
        id: e.id,
        data: e.data,
        titulo: e.descricao,
        subtitulo: `${e.status === 'PREVISTA' ? 'Prevista' : 'Recebida'} · ${e.contaDestino}`,
        valor: e.valor,
        tom: 'entrada' as const,
      })),
    itensTitulo: 'Entradas do mês',
  }
}

export function detalheSobra(
  entradas: Entrada[],
  despesas: Despesa[],
  periodo: string,
  cor: string
): Detalhe {
  const historico = mesesAte(periodo, MESES_HISTORICO).map((mes) => {
    const entrou = entradas
      .filter((e) => e.status === 'RECEBIDA' && e.data.slice(0, 7) === mes)
      .reduce((s, e) => s + e.valor, 0)
    const saiu = despesas.filter((d) => d.data.slice(0, 7) === mes).reduce((s, d) => s + d.valor, 0)
    return { mes, valor: entrou - saiu, entrou }
  })
  const atual = historico[historico.length - 1]
  const comp = comparacao(atual.valor, historico.slice(-1 - MESES_MEDIA, -1).map((h) => h.valor), true)
  const melhor = historico.reduce((m, h) => (h.valor > m.valor ? h : m), historico[0])
  const mesesNoAzul = historico.filter((h) => h.valor > 0).length

  return {
    titulo: 'Sobra do mês',
    subtitulo: 'O que entrou menos o que saiu',
    cor,
    estatisticas: [
      { rotulo: 'Sobrou', valor: formatCurrency(atual.valor), tom: atual.valor >= 0 ? 'bom' : 'ruim' },
      { rotulo: 'Da renda guardada', valor: pct(Math.max(atual.valor, 0), atual.entrou) },
      { rotulo: 'Meses no azul', valor: `${mesesNoAzul} de ${MESES_HISTORICO}` },
      { rotulo: `vs. ${MESES_MEDIA} meses antes`, ...comp },
    ],
    historico: historico.map(({ mes, valor }) => ({ mes, valor })),
    historicoTitulo: `Sobra nos últimos ${MESES_HISTORICO} meses · melhor: ${formatCurrency(melhor.valor)}`,
    itens: [],
    itensTitulo: '',
  }
}

export function detalheAPagar(pendentes: Vencimento[], cor: string): Detalhe {
  const total = pendentes.reduce((s, v) => s + v.valor, 0)
  const vencidos = pendentes.filter((v) => v.vencido)
  const proximo = pendentes.find((v) => !v.vencido)

  return {
    titulo: 'Ainda vai sair',
    subtitulo: 'Custos fixos e parcelas do mês ainda sem pagamento',
    cor,
    estatisticas: [
      { rotulo: 'Total', valor: formatCurrency(total) },
      { rotulo: 'Contas', valor: String(pendentes.length) },
      {
        rotulo: 'Vencidas',
        valor: String(vencidos.length),
        tom: vencidos.length ? 'ruim' : undefined,
        nota: vencidos.length ? formatCurrency(vencidos.reduce((s, v) => s + v.valor, 0)) : undefined,
      },
      {
        rotulo: 'Próxima',
        valor: proximo ? proximo.data.slice(8, 10) + '/' + proximo.data.slice(5, 7) : '—',
        nota: proximo?.descricao,
      },
    ],
    divisao: agrupar(pendentes, (v) => v.detalhe.startsWith('Parcela') ? 'Parcelas' : 'Custos fixos', (v) => v.valor),
    divisaoTitulo: 'Por tipo',
    itens: pendentes.map((v) => ({
      id: v.id,
      data: v.data,
      titulo: v.descricao,
      subtitulo: v.vencido ? 'Vencido' : v.detalhe,
      valor: v.valor,
      tom: v.vencido ? ('alerta' as const) : undefined,
    })),
    itensTitulo: 'Por data de vencimento',
  }
}

interface ParamsDisponivel {
  saldoHoje: number
  trajetoria: Trajetoria
  diasRestantes: number
  vencimentos: Vencimento[] // do mês corrente, ainda não pagos
  previstas: Entrada[] // entradas previstas pra conta do dia a dia no resto do mês
  cor: string
}

export function detalheDisponivel(p: ParamsDisponivel): Detalhe {
  const aPagar = p.vencimentos.reduce((s, v) => s + v.valor, 0)
  const aReceber = p.previstas.reduce((s, e) => s + e.valor, 0)
  const gastoDiaADia = p.trajetoria.ritmoDiario * (p.diasRestantes - 1)

  return {
    titulo: 'Dinheiro disponível',
    subtitulo: 'Como chegamos na previsão do fim do mês',
    cor: p.cor,
    estatisticas: [
      { rotulo: 'Saldo hoje', valor: formatCurrency(p.saldoHoje) },
      {
        rotulo: 'Gasto do dia a dia',
        valor: `${formatCurrency(p.trajetoria.ritmoDiario)}/dia`,
        nota: 'média do mês, sem fixos e parcelas',
      },
      {
        rotulo: 'Fim do mês',
        valor: formatCurrency(p.trajetoria.saldoFinal),
        tom: p.trajetoria.saldoFinal < 0 ? 'ruim' : 'bom',
      },
      {
        rotulo: 'Acaba em',
        valor: p.trajetoria.diaZerado ? `dia ${p.trajetoria.diaZerado}` : 'não acaba',
        tom: p.trajetoria.diaZerado ? 'ruim' : 'bom',
      },
    ],
    divisao: [
      { nome: 'Saldo de hoje', valor: p.saldoHoje },
      { nome: 'Entradas previstas', valor: aReceber },
      { nome: 'Contas a vencer', valor: -aPagar },
      { nome: 'Gasto do dia a dia (estimado)', valor: -gastoDiaADia },
    ],
    divisaoTitulo: 'A conta da previsão',
    itens: [
      ...p.previstas.map((e) => ({
        id: e.id,
        data: e.data,
        titulo: e.descricao,
        subtitulo: 'Entrada prevista',
        valor: e.valor,
        tom: 'entrada' as const,
      })),
      ...p.vencimentos.map((v) => ({
        id: v.id,
        data: v.data,
        titulo: v.descricao,
        subtitulo: v.vencido ? 'Vencido' : v.detalhe,
        valor: v.valor,
        tom: v.vencido ? ('alerta' as const) : undefined,
      })),
    ].sort((a, b) => a.data.localeCompare(b.data)),
    itensTitulo: 'O que ainda acontece no mês',
  }
}
