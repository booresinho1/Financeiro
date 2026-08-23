import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'custos_fixos',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'descricao', coluna: 'descricao' },
    { nome: 'tipo', coluna: 'tipo' },
    { nome: 'valorPrevisto', coluna: 'valor_previsto', numero: true },
    { nome: 'periodicidade', coluna: 'periodicidade' },
    { nome: 'diaVencimento', coluna: 'dia_vencimento', numero: true },
    { nome: 'dataInicio', coluna: 'data_inicio' },
    { nome: 'dataFim', coluna: 'data_fim', opcional: true },
    { nome: 'categoria', coluna: 'categoria' },
    { nome: 'subcategoria', coluna: 'subcategoria' },
    { nome: 'ativo', coluna: 'ativo' },
    { nome: 'observacao', coluna: 'observacao', opcional: true },
  ],
})

export const config: Config = {
  path: '/api/custos-fixos',
}
