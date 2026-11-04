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

export interface PluggyItem {
  id: string
  itemId: string
  conector?: string
  criadoEm: string
}

export type StatusTransacaoPendente = 'PENDENTE' | 'IMPORTADA' | 'IGNORADA'

export interface TransacaoPendente {
  id: string
  pluggyId: string
  itemId: string
  contaPluggy?: string
  data: string
  descricao: string
  valor: number
  tipo: 'ENTRADA' | 'DESPESA'
  status: StatusTransacaoPendente
  tipoConta?: string | null
  parcelaNumero?: number | null
  parcelaTotal?: number | null
  dataCompra?: string | null
  /** despesa ou entrada do app ligada a esta transação; numa nota dividida, os ids separados por vírgula */
  idLancamento?: string | null
}

export interface CompraCartao {
  id: string
  data: string
  descricao: string
  valor: number
  categoria: string | null
  finalCartao: string | null
  parcela: string | null
}

export interface ParcelaCartao {
  id: string
  descricao: string
  numero: number
  total: number
  valor: number
  restantes: number
  valorRestante: number
  dataCompra: string | null
}

export interface CartaoResumo {
  id: string
  banco: string
  nome: string
  final: string | null
  bandeira: string | null
  limite: number | null
  limiteDisponivel: number | null
  usado: number
  atualizadoEm: string | null
  faturaAberta: {
    fechamentoEstimado: string | null
    vencimentoEstimado: string | null
    lancado: number
    parcelasPrevistas: number
    total: number
    compras: CompraCartao[]
  }
  ultimaFatura: {
    id: string
    fechamento: string | null
    vencimento: string
    total: number
    minimo: number | null
    pago: number
    dataPagamento: string | null
  } | null
  faturas: {
    id: string
    fechamento: string | null
    vencimento: string
    total: number
    encargos: number
  }[]
  parcelas: ParcelaCartao[]
  totalParcelasRestantes: number
  proximasFaturas: { vencimentoEstimado: string | null; valor: number; parcelas: number }[]
}

export interface ContaBanco {
  id: string
  nome: string
  tipo: 'BANK' | 'CREDIT' | string
  subtipo: string | null
  saldo: number
  limite: number | null
  limiteDisponivel: number | null
  vencimento: string | null
  fechamento: string | null
}

export interface BancoConectado {
  itemId: string
  conectorId: number
  nome: string
  imageUrl: string | null
  cor: string | null
  status: string
  atualizadoEm: string | null
  contas: ContaBanco[]
}

export interface ContaPluggy {
  id: string
  nome: string
  tipo: string
  saldo: number
}
