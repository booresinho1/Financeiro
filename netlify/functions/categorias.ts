import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'categorias',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'nome', coluna: 'nome' },
    { nome: 'ativa', coluna: 'ativa' },
  ],
})

export const config: Config = {
  path: '/api/categorias',
}
