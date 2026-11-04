import { calcularTotalEmContas } from '@/lib/saldos'
import { somarMeses } from '@/lib/datas'
import type {
  Conta,
  CustoFixo,
  Despesa,
  Entrada,
  Movimentacao,
  PagamentoCustoFixo,
  Parcela,
} from '@/types/finance'

export interface MesFluxo {
  mes: string // YYYY-MM
  entradas: number
  entradaEstimada: boolean
  parcelas: number
  custosFixos: number
  gastoVariavel: number
  resultado: number
  saldo: number
}

export interface DadosFluxo {
  contas: Conta[]
  despesas: Despesa[]
  entradas: Entrada[]
  movimentacoes: Movimentacao[]
  custosFixos: CustoFixo[]
  pagamentos: PagamentoCustoFixo[]
  parcelas: Parcela[]
}

const MESES_HISTORICO = 3

function somarPorMes<T>(itens: T[], mesDe: (item: T) => string, valorDe: (item: T) => number) {
  const porMes = new Map<string, number>()
  for (const item of itens) {
    const mes = mesDe(item)
    porMes.set(mes, (porMes.get(mes) ?? 0) + valorDe(item))
  }
  return porMes
}

/**
 * Projeta o saldo mês a mês a partir de hoje. Mesma lógica da view
 * `trajetoria_saldo` (scripts/): entradas previstas (ou renda média quando não há
 * nenhuma cadastrada), parcelas de dívidas, custos fixos e gasto variável médio.
 */
export function projetarFluxoCaixa(dados: DadosFluxo, hoje: string, meses = 12): MesFluxo[] {
  const mesAtual = hoje.slice(0, 7)
  const [ano, mesNum] = mesAtual.split('-').map(Number)
  const diasNoMes = new Date(ano, mesNum, 0).getDate()
  const diasPassados = Number(hoje.slice(8, 10))

  // gasto variável: despesas dos últimos meses fechados, fora as que já são parcela/custo fixo
  const despesasFixas = new Set<string>()
  for (const p of dados.parcelas) if (p.idDespesa) despesasFixas.add(p.idDespesa)
  for (const g of dados.pagamentos) if (g.idDespesa) despesasFixas.add(g.idDespesa)

  const inicioHistorico = somarMeses(`${mesAtual}-01`, -MESES_HISTORICO).slice(0, 7)
  const totalVariavel = dados.despesas
    .filter((d) => {
      const mes = d.data.slice(0, 7)
      return mes >= inicioHistorico && mes < mesAtual && !despesasFixas.has(d.id)
    })
    .reduce((soma, d) => soma + d.valor, 0)
  const mediaVariavel = totalVariavel / MESES_HISTORICO

  // renda média dos meses já fechados, usada onde não há entrada prevista
  const recebidasPorMes = somarPorMes(
    dados.entradas.filter((e) => e.status === 'RECEBIDA' && e.data.slice(0, 7) < mesAtual),
    (e) => e.data.slice(0, 7),
    (e) => e.valor
  )
  const rendaMedia = recebidasPorMes.size
    ? [...recebidasPorMes.values()].reduce((a, b) => a + b, 0) / recebidasPorMes.size
    : 0

  const previstasPorMes = somarPorMes(
    dados.entradas.filter((e) => e.status === 'PREVISTA' && e.data.slice(0, 7) >= mesAtual),
    (e) => e.data.slice(0, 7),
    (e) => e.valor
  )

  // parcela vencida e não paga cai no mês corrente: ainda é dívida
  const parcelasPorMes = somarPorMes(
    dados.parcelas.filter((p) => p.status === 'PENDENTE' || p.status === 'ATRASADA'),
    (p) => (p.dataVencimento.slice(0, 7) < mesAtual ? mesAtual : p.dataVencimento.slice(0, 7)),
    (p) => p.valorPrevisto
  )

  const pagosNoMesAtual = new Set(
    dados.pagamentos.filter((g) => g.periodo === mesAtual).map((g) => g.idCustoFixo)
  )

  let saldo = calcularTotalEmContas(dados.contas, dados)
  const linhas: MesFluxo[] = []

  for (let i = 0; i < meses; i++) {
    const mes = somarMeses(`${mesAtual}-01`, i).slice(0, 7)
    const ehAtual = mes === mesAtual

    const prevista = previstasPorMes.get(mes)
    // no mês corrente o recebido já está no saldo, então nunca se usa a média
    const entradas = ehAtual ? (prevista ?? 0) : (prevista ?? rendaMedia)
    const entradaEstimada = !ehAtual && prevista === undefined && rendaMedia > 0

    const custosFixos = dados.custosFixos
      .filter((c) => {
        if (!c.ativo) return false
        if (c.dataInicio.slice(0, 7) > mes) return false
        if (c.dataFim && c.dataFim.slice(0, 7) < mes) return false
        if (ehAtual && pagosNoMesAtual.has(c.id)) return false
        return true
      })
      .reduce((soma, c) => soma + c.valorPrevisto, 0)

    const gastoVariavel = ehAtual
      ? (mediaVariavel * (diasNoMes - diasPassados)) / diasNoMes
      : mediaVariavel

    const parcelas = parcelasPorMes.get(mes) ?? 0
    const resultado = entradas - parcelas - custosFixos - gastoVariavel
    saldo += resultado

    linhas.push({
      mes,
      entradas,
      entradaEstimada,
      parcelas,
      custosFixos,
      gastoVariavel,
      resultado,
      saldo,
    })
  }

  return linhas
}
