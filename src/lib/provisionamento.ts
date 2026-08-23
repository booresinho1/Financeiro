import type { CustoFixo, Despesa } from '@/types/finance'

export type StatusProvisionamento = 'CONCILIADO' | 'DIVERGENTE' | 'PENDENTE'

export interface ResultadoProvisionamento {
  realizado: number
  status: StatusProvisionamento
  despesaVinculada?: Despesa
}

export function calcularProvisionamento(
  custoFixo: CustoFixo,
  despesasDoPeriodo: Despesa[]
): ResultadoProvisionamento {
  const candidatas = despesasDoPeriodo.filter(
    (d) => d.categoria === custoFixo.categoria && d.subcategoria === custoFixo.subcategoria
  )

  if (candidatas.length === 0) {
    return { realizado: 0, status: 'PENDENTE' }
  }

  const exata = candidatas.find((d) => Math.abs(d.valor - custoFixo.valorPrevisto) < 0.01)
  const escolhida =
    exata ??
    candidatas.reduce((maisProxima, atual) =>
      Math.abs(atual.valor - custoFixo.valorPrevisto) <
      Math.abs(maisProxima.valor - custoFixo.valorPrevisto)
        ? atual
        : maisProxima
    )

  return {
    realizado: escolhida.valor,
    status: exata ? 'CONCILIADO' : 'DIVERGENTE',
    despesaVinculada: escolhida,
  }
}
