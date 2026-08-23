import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'subcategorias',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'idCategoria', coluna: 'id_categoria' },
    { nome: 'nome', coluna: 'nome' },
    { nome: 'ativa', coluna: 'ativa' },
  ],
})

export const config: Config = {
  path: '/api/subcategorias',
}
