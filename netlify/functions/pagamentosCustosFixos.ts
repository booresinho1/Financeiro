import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'pagamentos_custos_fixos',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'idCustoFixo', coluna: 'id_custo_fixo' },
    { nome: 'periodo', coluna: 'periodo' },
    { nome: 'valorPago', coluna: 'valor_pago', numero: true },
    { nome: 'dataPagamento', coluna: 'data_pagamento' },
    { nome: 'idDespesa', coluna: 'id_despesa', opcional: true },
  ],
})

export const config: Config = {
  path: '/api/pagamentos-custos-fixos',
}
