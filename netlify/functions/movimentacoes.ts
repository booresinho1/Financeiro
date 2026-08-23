import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'movimentacoes',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'data', coluna: 'data' },
    { nome: 'conta', coluna: 'conta' },
    { nome: 'tipo', coluna: 'tipo' },
    { nome: 'valor', coluna: 'valor', numero: true },
    { nome: 'descricao', coluna: 'descricao' },
    { nome: 'contaOrigem', coluna: 'conta_origem', opcional: true },
    { nome: 'contaDestino', coluna: 'conta_destino', opcional: true },
  ],
})

export const config: Config = {
  path: '/api/movimentacoes',
}
