import type { Divida, Parcela, StatusParcela } from '@/types/finance'
import { hojeIso } from '@/lib/datas'

export interface ResumoDivida {
  totalPago: number
  totalRestante: number
  parcelasPagas: number
  parcelasRestantes: number
  dataPrevistaTermino: string | null
}

export function calcularResumoDivida(divida: Divida, parcelas: Parcela[]): ResumoDivida {
  const daDivida = parcelas.filter((p) => p.idDivida === divida.id)
  const pagas = daDivida.filter((p) => p.status === 'PAGA')
  const naoCanceladas = daDivida.filter((p) => p.status !== 'CANCELADA')

  const totalPago = pagas.reduce((soma, p) => soma + (p.valorPago || p.valorPrevisto), 0)
  const totalPrevisto = naoCanceladas.reduce((soma, p) => soma + p.valorPrevisto, 0)
  const ultimaParcela = [...daDivida].sort((a, b) => b.numeroParcela - a.numeroParcela)[0]

  return {
    totalPago,
    totalRestante: totalPrevisto - totalPago,
    parcelasPagas: pagas.length,
    parcelasRestantes: naoCanceladas.length - pagas.length,
    dataPrevistaTermino: ultimaParcela?.dataVencimento ?? null,
  }
}

export function statusEfetivoParcela(parcela: Parcela): StatusParcela {
  if (parcela.status === 'PENDENTE' && parcela.dataVencimento < hojeIso()) {
    return 'ATRASADA'
  }
  return parcela.status
}
