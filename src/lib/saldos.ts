import type { Conta, Despesa, Entrada, Movimentacao } from '@/types/finance'

interface DadosSaldo {
  despesas: Despesa[]
  entradas: Entrada[]
  movimentacoes: Movimentacao[]
}

export function calcularSaldo(conta: Conta, dados: DadosSaldo, ateData?: string): number {
  let saldo = conta.saldoInicial

  for (const mov of dados.movimentacoes) {
    if (ateData && mov.data > ateData) continue
    if (mov.tipo === 'ENTRADA' && mov.conta === conta.nome) saldo += mov.valor
    if (mov.tipo === 'RETIRADA' && mov.conta === conta.nome) saldo -= mov.valor
    if (mov.tipo === 'TRANSFERENCIA') {
      if (mov.contaDestino === conta.nome) saldo += mov.valor
      if (mov.contaOrigem === conta.nome) saldo -= mov.valor
    }
  }

  if (conta.tipo === 'AUTOMATICA') {
    for (const entrada of dados.entradas) {
      if (entrada.status !== 'RECEBIDA') continue
      if (ateData && entrada.data > ateData) continue
      if (entrada.contaDestino === conta.nome) saldo += entrada.valor
    }
    for (const despesa of dados.despesas) {
      if (ateData && despesa.data > ateData) continue
      saldo -= despesa.valor
    }
  }

  return saldo
}

export function calcularTotalEmContas(contas: Conta[], dados: DadosSaldo): number {
  return contas
    .filter((c) => c.ativa)
    .reduce((soma, conta) => soma + calcularSaldo(conta, dados), 0)
}
