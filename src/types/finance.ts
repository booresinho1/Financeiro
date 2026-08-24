export interface Despesa {
  id: string
  data: string
  descricao: string
  valor: number
  categoria: string
  subcategoria: string
}

export type StatusEntrada = 'PREVISTA' | 'RECEBIDA'

export interface Entrada {
  id: string
  data: string
  valor: number
  descricao: string
  categoria: string
  contaDestino: string
  status: StatusEntrada
  observacao?: string
}

export type TipoConta = 'AUTOMATICA' | 'MANUAL'

export interface Conta {
  id: string
  nome: string
  tipo: TipoConta
  saldoInicial: number
  dataSaldoInicial?: string
  ativa: boolean
}

export type TipoMovimentacao = 'ENTRADA' | 'RETIRADA' | 'TRANSFERENCIA'

export interface Movimentacao {
  id: string
  data: string
  conta: string
  tipo: TipoMovimentacao
  valor: number
  descricao: string
  contaOrigem?: string
  contaDestino?: string
}

export interface Orcamento {
  id: string
  categoria: string
  subcategoria?: string
  valorOrcado: number
  periodo: string
}

export type TipoCustoFixo = 'RECORRENTE' | 'PARCELADO'

export interface CustoFixo {
  id: string
  descricao: string
  tipo: TipoCustoFixo
  valorPrevisto: number
  periodicidade: string
  diaVencimento: number
  dataInicio: string
  dataFim?: string
  categoria: string
  subcategoria: string
  ativo: boolean
  observacao?: string
}

export interface Divida {
  id: string
  descricao: string
  valorTotal: number
  numParcelas: number
  valorParcela: number
  primeiroVencimento: string
  categoria?: string
  subcategoria?: string
  observacao?: string
}

export type StatusParcela = 'PENDENTE' | 'PAGA' | 'ATRASADA' | 'CANCELADA'

export interface Parcela {
  id: string
  idDivida: string
  numeroParcela: number
  dataVencimento: string
  valorPrevisto: number
  dataPagamento?: string
  valorPago?: number
  status: StatusParcela
  idDespesa?: string
  observacao?: string
}

export interface Categoria {
  id: string
  nome: string
  ativa: boolean
}

export interface Subcategoria {
  id: string
  idCategoria: string
  nome: string
  ativa: boolean
}

export interface Meta {
  id: string
  idConta: string
  valorMeta: number
}

export interface PagamentoCustoFixo {
  id: string
  idCustoFixo: string
  periodo: string
  valorPago: number
  dataPagamento: string
  idDespesa?: string
}
