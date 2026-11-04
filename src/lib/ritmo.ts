import { calcularSaldo } from '@/lib/saldos'
import { somarMeses } from '@/lib/datas'
import type { Vencimento } from '@/lib/dashboardResumo'
import type {
  Conta,
  Despesa,
  Entrada,
  Movimentacao,
  PagamentoCustoFixo,
  Parcela,
} from '@/types/finance'

function diasDoMes(periodo: string): number {
  const [ano, mes] = periodo.split('-').map(Number)
  return new Date(ano, mes, 0).getDate()
}

function dataDoDia(periodo: string, dia: number): string {
  return `${periodo}-${String(dia).padStart(2, '0')}`
}

/** Ids das despesas que pagam parcela ou custo fixo (o resto é gasto do dia a dia). */
export function idsDespesasFixas(parcelas: Parcela[], pagamentos: PagamentoCustoFixo[]) {
  const parcelasIds = new Set(parcelas.flatMap((p) => (p.idDespesa ? [p.idDespesa] : [])))
  const fixosIds = new Set(pagamentos.flatMap((p) => (p.idDespesa ? [p.idDespesa] : [])))
  return { parcelasIds, fixosIds }
}

// ---------------------------------------------------------------------------
// 1. Ritmo do mês: gasto acumulado dia a dia × o normal dos meses anteriores
// ---------------------------------------------------------------------------

export interface PontoRitmo {
  dia: number
  atual: number | null
  normal: number | null
  faixa: [number, number] | null
}

export interface Ritmo {
  pontos: PontoRitmo[]
  diaReferencia: number
  acumulado: number
  normalNoDia: number | null
  mesesComparados: number
}

const MESES_HISTORICO = 3

function acumuladoPorDia(despesas: Despesa[], periodo: string, totalDias: number): number[] {
  const porDia = Array(totalDias + 1).fill(0)
  for (const d of despesas) {
    if (d.data.slice(0, 7) !== periodo) continue
    porDia[Number(d.data.slice(8, 10))] += d.valor
  }
  for (let i = 1; i <= totalDias; i++) porDia[i] += porDia[i - 1]
  return porDia
}

export function ritmoDoMes(despesas: Despesa[], periodo: string, hoje: string): Ritmo {
  const totalDias = diasDoMes(periodo)
  const atual = acumuladoPorDia(despesas, periodo, totalDias)
  const diaReferencia =
    periodo === hoje.slice(0, 7) ? Number(hoje.slice(8, 10)) : periodo < hoje ? totalDias : 0

  // só entra no "normal" o mês anterior que teve algum gasto lançado
  const historico: number[][] = []
  for (let i = 1; i <= MESES_HISTORICO; i++) {
    const mes = somarMeses(`${periodo}-01`, -i).slice(0, 7)
    const dias = diasDoMes(mes)
    const acumulado = acumuladoPorDia(despesas, mes, dias)
    if (acumulado[dias] > 0) historico.push(acumulado)
  }

  const pontos: PontoRitmo[] = []
  for (let dia = 1; dia <= totalDias; dia++) {
    const valores = historico.map((h) => h[Math.min(dia, h.length - 1)])
    pontos.push({
      dia,
      atual: dia <= diaReferencia ? atual[dia] : null,
      normal: valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null,
      faixa: valores.length ? [Math.min(...valores), Math.max(...valores)] : null,
    })
  }

  const ref = pontos[diaReferencia - 1]
  return {
    pontos,
    diaReferencia,
    acumulado: diaReferencia ? atual[diaReferencia] : 0,
    normalNoDia: ref?.normal ?? null,
    mesesComparados: historico.length,
  }
}

// ---------------------------------------------------------------------------
// 2. Para onde foi o dinheiro: composição do que saiu no mês
// ---------------------------------------------------------------------------

export interface SegmentoComposicao {
  id: string
  nome: string
  valor: number
  tipo: 'fixos' | 'parcelas' | 'categoria' | 'outros' | 'aPagar' | 'sobrou'
}

export function composicaoDoMes(
  despesas: Despesa[],
  periodo: string,
  ids: { parcelasIds: Set<string>; fixosIds: Set<string> },
  entradas: number,
  aPagar: number
): SegmentoComposicao[] {
  let fixos = 0
  let parcelas = 0
  const porCategoria = new Map<string, number>()
  for (const d of despesas) {
    if (d.data.slice(0, 7) !== periodo) continue
    if (ids.fixosIds.has(d.id)) fixos += d.valor
    else if (ids.parcelasIds.has(d.id)) parcelas += d.valor
    else porCategoria.set(d.categoria, (porCategoria.get(d.categoria) ?? 0) + d.valor)
  }

  const categorias = [...porCategoria.entries()].sort((a, b) => b[1] - a[1])
  const top = categorias.slice(0, 3)
  const outros = categorias.slice(3).reduce((s, [, v]) => s + v, 0)

  const segmentos: SegmentoComposicao[] = [
    { id: 'fixos', nome: 'Custos fixos', valor: fixos, tipo: 'fixos' },
    { id: 'parcelas', nome: 'Parcelas', valor: parcelas, tipo: 'parcelas' },
    ...top.map(([nome, valor]): SegmentoComposicao => ({
      id: `cat-${nome}`,
      nome,
      valor,
      tipo: 'categoria',
    })),
    { id: 'outros', nome: 'Outras categorias', valor: outros, tipo: 'outros' },
    { id: 'aPagar', nome: 'Ainda vai sair', valor: aPagar, tipo: 'aPagar' },
  ]
  const saiu = segmentos.reduce((s, x) => s + x.valor, 0)
  if (entradas > saiu) {
    segmentos.push({ id: 'sobrou', nome: 'Sobra', valor: entradas - saiu, tipo: 'sobrou' })
  }
  return segmentos.filter((s) => s.valor > 0)
}

export type SegmentoColorido = SegmentoComposicao & { cor: string }

interface PaletaComposicao {
  composicao: readonly string[]
  inkMuted: string
  serieDespesa: string
  income: string
}

/** Cor de cada pedaço; a mesma regra vale pra barra "Para onde foi" e pro calendário. */
export function colorirSegmentos(
  segmentos: SegmentoComposicao[],
  paleta: PaletaComposicao
): SegmentoColorido[] {
  let indiceCategoria = 0
  return segmentos.map((s) => {
    const cor =
      s.tipo === 'fixos'
        ? paleta.composicao[0]
        : s.tipo === 'parcelas'
          ? paleta.composicao[1]
          : s.tipo === 'categoria'
            ? paleta.composicao[2 + Math.min(indiceCategoria++, 2)]
            : s.tipo === 'outros'
              ? paleta.inkMuted
              : s.tipo === 'aPagar'
                ? paleta.serieDespesa
                : paleta.income
    return { ...s, cor }
  })
}

/** Em qual pedaço da composição uma despesa cai (fixos, parcelas, top categoria ou outros). */
export function grupoDaDespesa(
  d: Despesa,
  ids: { parcelasIds: Set<string>; fixosIds: Set<string> },
  categoriasDestaque: string[]
): string {
  if (ids.fixosIds.has(d.id)) return 'fixos'
  if (ids.parcelasIds.has(d.id)) return 'parcelas'
  if (categoriasDestaque.includes(d.categoria)) return `cat-${d.categoria}`
  return 'outros'
}

// ---------------------------------------------------------------------------
// 3. Até quando dá: saldo da conta do dia a dia no mês, real e no ritmo atual
// ---------------------------------------------------------------------------

export interface PontoTrajetoria {
  dia: number
  real: number | null
  projetado: number | null
}

export interface Trajetoria {
  pontos: PontoTrajetoria[]
  diaZerado: number | null
  saldoFinal: number
  ritmoDiario: number
}

interface DadosTrajetoria {
  conta: Conta
  despesas: Despesa[]
  entradas: Entrada[]
  movimentacoes: Movimentacao[]
  vencimentos: Vencimento[] // do mês corrente, ainda não pagos
  idsFixos: { parcelasIds: Set<string>; fixosIds: Set<string> }
}

/**
 * Do dia 1 até hoje usa o saldo real; daí pra frente desconta o gasto médio do
 * dia a dia (sem parcelas e custos fixos), as contas a vencer e soma as entradas previstas.
 */
export function trajetoriaDoMes(dados: DadosTrajetoria, hoje: string): Trajetoria {
  const periodo = hoje.slice(0, 7)
  const totalDias = diasDoMes(periodo)
  const diaHoje = Number(hoje.slice(8, 10))
  const base = { despesas: dados.despesas, entradas: dados.entradas, movimentacoes: dados.movimentacoes }

  const variavelAteHoje = dados.despesas
    .filter(
      (d) =>
        d.data.slice(0, 7) === periodo &&
        d.data.slice(0, 10) <= hoje &&
        !dados.idsFixos.fixosIds.has(d.id) &&
        !dados.idsFixos.parcelasIds.has(d.id)
    )
    .reduce((s, d) => s + d.valor, 0)
  const ritmoDiario = variavelAteHoje / diaHoje

  const pontos: PontoTrajetoria[] = []
  let saldo = 0
  let diaZerado: number | null = null

  for (let dia = 1; dia <= totalDias; dia++) {
    const data = dataDoDia(periodo, dia)
    if (dia <= diaHoje) {
      saldo = calcularSaldo(dados.conta, base, data)
      pontos.push({ dia, real: saldo, projetado: dia === diaHoje ? saldo : null })
      continue
    }
    const entra = dados.entradas
      .filter(
        (e) =>
          e.status === 'PREVISTA' &&
          e.contaDestino === dados.conta.nome &&
          e.data.slice(0, 10) === data
      )
      .reduce((s, e) => s + e.valor, 0)
    // conta vencida e não paga cai amanhã: ainda vai sair
    const sai = dados.vencimentos
      .filter((v) => (dia === diaHoje + 1 ? v.data <= data : v.data === data))
      .reduce((s, v) => s + v.valor, 0)
    saldo = saldo + entra - sai - ritmoDiario
    if (diaZerado === null && saldo < 0) diaZerado = dia
    pontos.push({ dia, real: null, projetado: saldo })
  }

  return { pontos, diaZerado, saldoFinal: saldo, ritmoDiario }
}
