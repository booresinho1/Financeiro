import type { CartaoResumo, Divida, Parcela } from '@/types/finance'
import { somarMeses } from '@/lib/datas'

export type OrigemParcelamento = 'cartao' | 'manual'

export interface Parcelamento {
  id: string
  nome: string
  origem: OrigemParcelamento
  /** banco do cartão ou nada, na dívida manual */
  rotuloOrigem: string
  idDivida?: string
  totalParcelas: number
  pagas: number
  valorParcela: number
  falta: number
  proxima: { data: string | null; valor: number } | null
  terminaEm: string | null
  atrasadas: number
  porMes: Record<string, number>
  /** dívida manual com a mesma parcela de uma compra do cartão: pode estar contada duas vezes */
  repeteCartao?: string
}

export interface MesParcelas {
  mes: string
  total: number
  porItem: Record<string, number>
}

export interface ResumoParcelamentos {
  itens: Parcelamento[]
  meses: MesParcelas[]
  falta: number
  faltaCartao: number
  faltaManual: number
  terminaEm: string | null
}

const MAX_MESES = 18

function mesDe(iso: string): string {
  return iso.slice(0, 7)
}

/** Dívidas lançadas à mão: só o que está pendente ou atrasado ainda falta. Atrasada pesa no mês atual. */
function daDivida(d: Divida, parcelas: Parcela[], hoje: string): Parcelamento {
  const minhas = parcelas.filter((p) => p.idDivida === d.id)
  const abertas = minhas
    .filter((p) => p.status === 'PENDENTE' || p.status === 'ATRASADA')
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
  const mesAtual = mesDe(hoje)
  const porMes: Record<string, number> = {}
  for (const p of abertas) {
    const mes = mesDe(p.dataVencimento) < mesAtual ? mesAtual : mesDe(p.dataVencimento)
    porMes[mes] = (porMes[mes] ?? 0) + p.valorPrevisto
  }
  return {
    id: `m:${d.id}`,
    nome: d.descricao,
    origem: 'manual',
    rotuloOrigem: 'Manual',
    idDivida: d.id,
    totalParcelas: d.numParcelas,
    pagas: minhas.filter((p) => p.status === 'PAGA').length,
    valorParcela: d.valorParcela,
    falta: abertas.reduce((s, p) => s + p.valorPrevisto, 0),
    proxima: abertas[0] ? { data: abertas[0].dataVencimento, valor: abertas[0].valorPrevisto } : null,
    terminaEm: abertas.length ? mesDe(abertas[abertas.length - 1].dataVencimento) : null,
    atrasadas: abertas.filter((p) => p.dataVencimento.slice(0, 10) < hoje).length,
    porMes,
  }
}

/**
 * Compras parceladas no cartão: cada parcela que falta cai numa fatura, a partir da aberta.
 * Se a fatura aberta já foi paga adiantado, a parcela dela não falta mais.
 */
function doCartao(c: CartaoResumo): Parcelamento[] {
  const venc = c.faturaAberta.vencimentoEstimado
  const abertaPaga = c.faturaAberta.pago >= c.faturaAberta.total - 0.5
  return c.parcelas.map((p) => {
    const porMes: Record<string, number> = {}
    const datas: string[] = []
    for (let i = 0; i < p.restantes; i++) {
      const indice = (p.primeiraFaturaRestante ?? 1) + i
      if (indice === 0 && abertaPaga) continue
      const data = venc ? somarMeses(venc, indice) : null
      if (!data) continue
      porMes[mesDe(data)] = (porMes[mesDe(data)] ?? 0) + p.valor
      datas.push(data)
    }
    const falta = datas.length * p.valor
    return {
      id: `c:${c.id}:${p.id}`,
      nome: p.descricao,
      origem: 'cartao' as const,
      rotuloOrigem: [c.banco, c.final && `final ${c.final}`].filter(Boolean).join(' · ') || 'Cartão',
      totalParcelas: p.total,
      pagas: p.total - datas.length,
      valorParcela: p.valor,
      falta,
      proxima: datas[0] ? { data: datas[0], valor: p.valor } : null,
      terminaEm: datas.length ? mesDe(datas[datas.length - 1]) : null,
      atrasadas: 0,
      porMes,
    }
  })
}

export function montarParcelamentos(
  dividas: Divida[],
  parcelas: Parcela[],
  cartoes: CartaoResumo[],
  hoje: string
): ResumoParcelamentos {
  const itens = [...dividas.map((d) => daDivida(d, parcelas, hoje)), ...cartoes.flatMap(doCartao)]
    .filter((i) => i.falta > 0.005)
    .sort((a, b) => b.falta - a.falta)
  for (const m of itens.filter((i) => i.origem === 'manual')) {
    const igual = itens.find((c) => c.origem === 'cartao' && Math.abs(c.valorParcela - m.valorParcela) <= 0.05)
    if (igual) m.repeteCartao = igual.nome
  }

  const terminaEm = itens.reduce<string | null>((m, i) => (i.terminaEm && (!m || i.terminaEm > m) ? i.terminaEm : m), null)
  const mesAtual = mesDe(hoje)
  const meses: MesParcelas[] = []
  if (terminaEm) {
    for (let k = 0; k < MAX_MESES; k++) {
      const mes = somarMeses(`${mesAtual}-01`, k).slice(0, 7)
      if (mes > terminaEm) break
      const porItem: Record<string, number> = {}
      let total = 0
      for (const i of itens) {
        const v = i.porMes[mes] ?? 0
        if (v > 0) {
          porItem[i.id] = v
          total += v
        }
      }
      meses.push({ mes, total, porItem })
    }
  }

  const soma = (o: OrigemParcelamento) => itens.filter((i) => i.origem === o).reduce((s, i) => s + i.falta, 0)
  return {
    itens,
    meses,
    falta: itens.reduce((s, i) => s + i.falta, 0),
    faltaCartao: soma('cartao'),
    faltaManual: soma('manual'),
    terminaEm,
  }
}
