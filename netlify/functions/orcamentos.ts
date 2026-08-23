import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'orcamentos',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'categoria', coluna: 'categoria' },
    { nome: 'subcategoria', coluna: 'subcategoria', opcional: true },
    { nome: 'valorOrcado', coluna: 'valor_orcado', numero: true },
    { nome: 'periodo', coluna: 'periodo', opcional: true },
  ],
})

export const config: Config = {
  path: '/api/orcamentos',
}
