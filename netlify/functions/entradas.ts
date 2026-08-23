import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'entradas',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'data', coluna: 'data' },
    { nome: 'valor', coluna: 'valor', numero: true },
    { nome: 'descricao', coluna: 'descricao' },
    { nome: 'categoria', coluna: 'categoria' },
    { nome: 'contaDestino', coluna: 'conta_destino' },
    { nome: 'status', coluna: 'status' },
    { nome: 'observacao', coluna: 'observacao', opcional: true },
  ],
})

export const config: Config = {
  path: '/api/entradas',
}
