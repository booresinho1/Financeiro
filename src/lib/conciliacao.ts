import type { TransacaoPendente } from '@/types/finance'

/** Despesa ou entrada do app que pode ser a mesma coisa que a transação do banco. */
export interface Lancamento {
  id: string
  data: string
  descricao: string
  valor: number
}

export interface Sugestao extends Lancamento {
  /** exato: mesmo valor. compraInteira: a compra parcelada foi lançada de uma vez, com o valor total. */
  modo: 'exato' | 'compraInteira'
  dias: number
}

const JANELA_DIAS = 3
const MAX_SUGESTOES = 3
const CENTAVO = 0.01

function diasEntre(a: string, b: string): number {
  const dia = (iso: string) => {
    const [ano, mes, d] = iso.slice(0, 10).split('-').map(Number)
    return Date.UTC(ano, mes - 1, d)
  }
  return Math.abs(dia(a) - dia(b)) / 86_400_000
}

/**
 * Lançamentos do app que parecem ser esta transação: mesmo valor, com data a até 3 dias. O que
 * já está vinculado fica de fora, salvo a compra inteira, que todas as parcelas apontam.
 */
export function sugerirConciliacao(
  t: TransacaoPendente,
  lancamentos: Lancamento[],
  vinculados: Set<string>
): Sugestao[] {
  const sugestoes: Sugestao[] = []
  const total = t.parcelaTotal ?? 1
  const dataDaCompra = t.dataCompra ?? t.data

  for (const l of lancamentos) {
    const dias = diasEntre(l.data, t.data)
    if (dias <= JANELA_DIAS && Math.abs(l.valor - t.valor) <= CENTAVO && !vinculados.has(l.id)) {
      sugestoes.push({ ...l, modo: 'exato', dias })
    } else if (
      total > 1 &&
      diasEntre(l.data, dataDaCompra) <= JANELA_DIAS &&
      // parcelas arredondam: 100 em 3x são 33,33, então a soma pode errar um centavo por parcela
      Math.abs(l.valor - t.valor * total) <= CENTAVO * total
    ) {
      sugestoes.push({ ...l, modo: 'compraInteira', dias: diasEntre(l.data, dataDaCompra) })
    }
  }

  return sugestoes.sort((a, b) => a.dias - b.dias).slice(0, MAX_SUGESTOES)
}

/** Só dá para conciliar em lote quando não há dúvida: uma sugestão só, de valor exato. */
export function sugestaoUnica(sugestoes: Sugestao[]): Sugestao | null {
  return sugestoes.length === 1 && sugestoes[0].modo === 'exato' ? sugestoes[0] : null
}
