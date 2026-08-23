import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'despesas',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'data', coluna: 'data' },
    { nome: 'descricao', coluna: 'descricao' },
    { nome: 'valor', coluna: 'valor', numero: true },
    { nome: 'categoria', coluna: 'categoria' },
    { nome: 'subcategoria', coluna: 'subcategoria' },
  ],
})

export const config: Config = {
  path: '/api/despesas',
}
