import { somarMeses } from '@/lib/datas'
import type { Despesa } from '@/types/finance'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const MESES_NAS_BARRAS = 12

export function nomeDoMes(periodo: string): string {
  return MESES[Number(periodo.slice(5, 7)) - 1]
}

function diasDoMes(periodo: string): number {
  const [ano, mes] = periodo.split('-').map(Number)
  return new Date(ano, mes, 0).getDate()
}

function mesAnterior(periodo: string): string {
  return somarMeses(`${periodo}-01`, -1).slice(0, 7)
}

function somar(despesas: Despesa[]): number {
  return despesas.reduce((s, d) => s + d.valor, 0)
}

/** Até que dia do mês anterior comparar: no mês em curso, só até o mesmo dia, para ser justo. */
function diaDeCorte(periodo: string, hoje: string): number | null {
  return periodo === hoje.slice(0, 7) ? Number(hoje.slice(8, 10)) : null
}

function doMesAte(despesas: Despesa[], periodo: string, ateDia: number | null): Despesa[] {
  return despesas.filter(
    (d) =>
      d.data.slice(0, 7) === periodo &&
      (ateDia === null || Number(d.data.slice(8, 10)) <= ateDia)
  )
}

/** Tira o que o banco põe antes do nome: "COMPRA C/CARTAO 31/10 08:37 Padaria" vira "Padaria". */
export function descricaoLimpa(descricao: string): string {
  const limpa = descricao
    .replace(/^(?:compra c\/cartao|pix\s*-\s*\w+|pagamento|transferencia\s*\w*)\s+\d{2}\/\d{2}(?:\s+\d{2}:\d{2})?\s+/i, '')
    .trim()
  return limpa || 'Sem descrição'
}

export interface BarraDoPeriodo {
  chave: string
  rotulo: string
  valor: number
  qtd: number
  futura: boolean
}

export interface ResumoDespesas {
  total: number
  qtd: number
  media: { valor: number; unidade: 'dia' | 'mês' } | null
  maior: Despesa | null
  /** só existe vendo um mês: o mês anterior, cortado no mesmo dia se este ainda está em curso */
  comparacao: { anterior: number; rotulo: string } | null
  barras: BarraDoPeriodo[]
}

function resumoDoMes(despesas: Despesa[], periodo: string, hoje: string): ResumoDespesas {
  const doMes = despesas.filter((d) => d.data.slice(0, 7) === periodo)
  const totalDias = diasDoMes(periodo)
  const mesDeHoje = hoje.slice(0, 7)
  const corte = diaDeCorte(periodo, hoje)
  const diasPassados = corte ?? (periodo < mesDeHoje ? totalDias : 0)

  const barras = Array.from({ length: totalDias }, (_, i): BarraDoPeriodo => {
    const chave = `${periodo}-${String(i + 1).padStart(2, '0')}`
    const doDia = doMes.filter((d) => d.data.slice(0, 10) === chave)
    return {
      chave,
      rotulo: `${String(i + 1).padStart(2, '0')}/${periodo.slice(5, 7)}`,
      valor: somar(doDia),
      qtd: doDia.length,
      futura: chave > hoje,
    }
  })

  const anterior = mesAnterior(periodo)
  const noAnterior = doMesAte(despesas, anterior, corte)
  const total = somar(doMes)

  return {
    total,
    qtd: doMes.length,
    media: diasPassados > 0 ? { valor: total / diasPassados, unidade: 'dia' } : null,
    maior: doMes.reduce<Despesa | null>((m, d) => (d.valor > (m?.valor ?? 0) ? d : m), null),
    comparacao: noAnterior.length
      ? {
          anterior: somar(noAnterior),
          rotulo: corte === null ? `em ${nomeDoMes(anterior)}` : `até o dia ${corte} de ${nomeDoMes(anterior)}`,
        }
      : null,
    barras,
  }
}

function resumoDeTudo(despesas: Despesa[]): ResumoDespesas {
  const meses = [...new Set(despesas.map((d) => d.data.slice(0, 7)))].sort()
  const barras = meses.slice(-MESES_NAS_BARRAS).map((mes): BarraDoPeriodo => {
    const doMes = despesas.filter((d) => d.data.slice(0, 7) === mes)
    return {
      chave: mes,
      rotulo: `${nomeDoMes(mes).slice(0, 3)}/${mes.slice(2, 4)}`,
      valor: somar(doMes),
      qtd: doMes.length,
      futura: false,
    }
  })
  const total = somar(despesas)
  return {
    total,
    qtd: despesas.length,
    media: meses.length ? { valor: total / meses.length, unidade: 'mês' } : null,
    maior: despesas.reduce<Despesa | null>((m, d) => (d.valor > (m?.valor ?? 0) ? d : m), null),
    comparacao: null,
    barras,
  }
}

/** Com `periodo` nulo resume todo o histórico, mês a mês. */
export function resumirDespesas(
  despesas: Despesa[],
  periodo: string | null,
  hoje: string
): ResumoDespesas {
  return periodo ? resumoDoMes(despesas, periodo, hoje) : resumoDeTudo(despesas)
}

export interface LinhaRanking {
  nome: string
  valor: number
  percentual: number
  /** valor no mês anterior, no mesmo corte; nulo vendo todo o histórico */
  anterior: number | null
}

function ranking(
  despesas: Despesa[],
  periodo: string | null,
  hoje: string,
  nomeDe: (d: Despesa) => string
): LinhaRanking[] {
  const atuais = periodo ? despesas.filter((d) => d.data.slice(0, 7) === periodo) : despesas
  const anteriores = periodo
    ? doMesAte(despesas, mesAnterior(periodo), diaDeCorte(periodo, hoje))
    : []
  const total = somar(atuais)
  const porNome = new Map<string, number>()
  for (const d of atuais) porNome.set(nomeDe(d), (porNome.get(nomeDe(d)) ?? 0) + d.valor)
  return [...porNome.entries()]
    .map(([nome, valor]) => ({
      nome,
      valor,
      percentual: total > 0 ? (valor / total) * 100 : 0,
      anterior: periodo ? somar(anteriores.filter((d) => nomeDe(d) === nome)) : null,
    }))
    .sort((a, b) => b.valor - a.valor)
}

export function rankingPorCategoria(despesas: Despesa[], periodo: string | null, hoje: string) {
  return ranking(despesas, periodo, hoje, (d) => d.categoria)
}

export function rankingPorSubcategoria(despesas: Despesa[], periodo: string | null, hoje: string) {
  return ranking(despesas, periodo, hoje, (d) => d.subcategoria || 'Sem subcategoria')
}

export interface GrupoDoDia {
  data: string
  total: number
  despesas: Despesa[]
}

/** Mantém a ordem recebida: quem chega primeiro define a posição do dia. */
export function agruparPorDia(despesas: Despesa[]): GrupoDoDia[] {
  const grupos = new Map<string, GrupoDoDia>()
  for (const d of despesas) {
    const data = d.data.slice(0, 10)
    const grupo = grupos.get(data) ?? { data, total: 0, despesas: [] }
    grupo.total += d.valor
    grupo.despesas.push(d)
    grupos.set(data, grupo)
  }
  return [...grupos.values()]
}
