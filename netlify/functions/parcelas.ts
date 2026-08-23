import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'parcelas',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'idDivida', coluna: 'id_divida' },
    { nome: 'numeroParcela', coluna: 'numero_parcela', numero: true },
    { nome: 'dataVencimento', coluna: 'data_vencimento' },
    { nome: 'valorPrevisto', coluna: 'valor_previsto', numero: true },
    { nome: 'dataPagamento', coluna: 'data_pagamento', opcional: true },
    { nome: 'valorPago', coluna: 'valor_pago', numero: true, opcional: true },
    { nome: 'status', coluna: 'status' },
    { nome: 'idDespesa', coluna: 'id_despesa', opcional: true },
    { nome: 'observacao', coluna: 'observacao', opcional: true },
  ],
})

export const config: Config = {
  path: '/api/parcelas',
}
