import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'dividas',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'descricao', coluna: 'descricao' },
    { nome: 'valorTotal', coluna: 'valor_total', numero: true },
    { nome: 'numParcelas', coluna: 'num_parcelas', numero: true },
    { nome: 'valorParcela', coluna: 'valor_parcela', numero: true },
    { nome: 'primeiroVencimento', coluna: 'primeiro_vencimento' },
    { nome: 'categoria', coluna: 'categoria', opcional: true },
    { nome: 'subcategoria', coluna: 'subcategoria', opcional: true },
    { nome: 'observacao', coluna: 'observacao', opcional: true },
  ],
})

export const config: Config = {
  path: '/api/dividas',
}
