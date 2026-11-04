import type { PluggyTransacao } from './pluggyClient'

const CATEGORIAS_INTERNAS = new Set(['Credit card payment', 'Same person transfer'])
const DESCRICOES_INTERNAS = /^PGTO\.? (CARTAO|CASH)|^PAGAMENTO RECEBIDO/i

/**
 * Pagamento de fatura e transferência para si mesmo só mudam o dinheiro de lugar: os gastos
 * já contam pelas compras. Vale nos dois lados (conta corrente e cartão).
 */
export function ehMovimentoInterno(t: PluggyTransacao): boolean {
  return CATEGORIAS_INTERNAS.has(t.category ?? '') || DESCRICOES_INTERNAS.test(t.description)
}

/**
 * No cartão, pendente é compra da fatura aberta: fica assim até a fatura fechar, então entra na
 * fila (ao ser confirmada, mantém o mesmo id e não duplica). Só não entra parcela com data futura.
 * Na conta corrente, pendente é pagamento agendado, que ainda não aconteceu.
 */
export function entraNaFila(t: PluggyTransacao, tipoConta: string, hoje: string): boolean {
  if (t.amount === 0 || ehMovimentoInterno(t)) return false
  if (t.status !== 'PENDING') return true
  return tipoConta === 'CREDIT' && t.date.slice(0, 10) <= hoje
}

export function linhaDaFila(
  t: PluggyTransacao,
  conta: { name: string; type: string },
  itemId: string
) {
  const parcela = t.creditCardMetadata
  return {
    id: crypto.randomUUID().split('-')[0],
    pluggy_id: t.id,
    item_id: itemId,
    conta_pluggy: conta.name,
    tipo_conta: conta.type,
    data: t.date.slice(0, 10),
    descricao: t.description,
    valor: Math.abs(t.amount),
    tipo: t.type === 'CREDIT' ? 'ENTRADA' : 'DESPESA',
    parcela_numero: parcela?.installmentNumber ?? null,
    parcela_total: parcela?.totalInstallments ?? null,
    data_compra: parcela?.purchaseDate?.slice(0, 10) ?? null,
  }
}
