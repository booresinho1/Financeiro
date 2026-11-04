import { somarMeses } from '@/lib/datas'
import type {
  CustoFixo,
  Despesa,
  Divida,
  Orcamento,
  PagamentoCustoFixo,
  Parcela,
} from '@/types/finance'

export interface Vencimento {
  id: string
  data: string
  descricao: string
  detalhe: string
  valor: number
  vencido: boolean
}

interface DadosVencimentos {
  custosFixos: CustoFixo[]
  pagamentos: PagamentoCustoFixo[]
  parcelas: Parcela[]
  dividas: Divida[]
}

function dataNoMes(mes: string, dia: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const ultimoDia = new Date(ano, m, 0).getDate()
  return `${mes}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`
}

function somarDias(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10)
}

/**
 * Contas a pagar até `dias` à frente, incluindo as já vencidas e não pagas.
 * Custo fixo vencido só conta no mês corrente: meses anteriores não pagos
 * não têm como ser distinguidos de "não lançado".
 */
export function proximosVencimentos(
  dados: DadosVencimentos,
  hoje: string,
  dias = 15
): Vencimento[] {
  const limite = somarDias(hoje, dias)
  const mesAtual = hoje.slice(0, 7)
  const lista: Vencimento[] = []

  for (const mes of [mesAtual, somarMeses(`${mesAtual}-01`, 1).slice(0, 7)]) {
    for (const c of dados.custosFixos) {
      if (!c.ativo) continue
      if (c.dataInicio.slice(0, 7) > mes) continue
      if (c.dataFim && c.dataFim.slice(0, 7) < mes) continue
      if (dados.pagamentos.some((p) => p.idCustoFixo === c.id && p.periodo === mes)) continue
      const data = dataNoMes(mes, c.diaVencimento)
      if (data > limite) continue
      lista.push({
        id: `cf-${c.id}-${mes}`,
        data,
        descricao: c.descricao,
        detalhe: 'Custo fixo',
        valor: c.valorPrevisto,
        vencido: data < hoje,
      })
    }
  }

  for (const p of dados.parcelas) {
    if (p.status !== 'PENDENTE' && p.status !== 'ATRASADA') continue
    if (p.dataVencimento > limite) continue
    const divida = dados.dividas.find((d) => d.id === p.idDivida)
    lista.push({
      id: `pa-${p.id}`,
      data: p.dataVencimento,
      descricao: divida?.descricao ?? 'Parcela',
      detalhe: divida ? `Parcela ${p.numeroParcela}/${divida.numParcelas}` : 'Parcela',
      valor: p.valorPrevisto,
      vencido: p.dataVencimento < hoje,
    })
  }

  return lista.sort((a, b) => a.data.localeCompare(b.data))
}

/** Tudo que vence dentro de um mês e ainda não foi pago (custos fixos e parcelas). */
export function vencimentosDoMes(dados: DadosVencimentos, mes: string, hoje: string): Vencimento[] {
  const lista: Vencimento[] = []

  for (const c of dados.custosFixos) {
    if (!c.ativo) continue
    if (c.dataInicio.slice(0, 7) > mes) continue
    if (c.dataFim && c.dataFim.slice(0, 7) < mes) continue
    if (dados.pagamentos.some((p) => p.idCustoFixo === c.id && p.periodo === mes)) continue
    const data = dataNoMes(mes, c.diaVencimento)
    lista.push({
      id: `cf-${c.id}-${mes}`,
      data,
      descricao: c.descricao,
      detalhe: 'Custo fixo',
      valor: c.valorPrevisto,
      vencido: data < hoje,
    })
  }

  for (const p of dados.parcelas) {
    if (p.status !== 'PENDENTE' && p.status !== 'ATRASADA') continue
    if (p.dataVencimento.slice(0, 7) !== mes) continue
    const divida = dados.dividas.find((d) => d.id === p.idDivida)
    lista.push({
      id: `pa-${p.id}`,
      data: p.dataVencimento,
      descricao: divida?.descricao ?? 'Parcela',
      detalhe: divida ? `Parcela ${p.numeroParcela}/${divida.numParcelas}` : 'Parcela',
      valor: p.valorPrevisto,
      vencido: p.dataVencimento < hoje,
    })
  }

  return lista.sort((a, b) => a.data.localeCompare(b.data))
}

export interface OrcamentoEstourado {
  nome: string
  percentual: number
}

export function orcamentosEstourados(
  orcamentos: Orcamento[],
  despesas: Despesa[],
  mes: string
): OrcamentoEstourado[] {
  return orcamentos
    // o orçamento vale para todo mês: o período gravado é só "MENSAL"
    .filter((o) => o.valorOrcado > 0)
    .map((o) => {
      const realizado = despesas
        .filter(
          (d) =>
            d.data.slice(0, 7) === mes &&
            d.categoria === o.categoria &&
            (!o.subcategoria || d.subcategoria === o.subcategoria)
        )
        .reduce((s, d) => s + d.valor, 0)
      return {
        nome: o.subcategoria ? `${o.categoria} / ${o.subcategoria}` : o.categoria,
        percentual: (realizado / o.valorOrcado) * 100,
      }
    })
    .filter((o) => o.percentual >= 100)
}
