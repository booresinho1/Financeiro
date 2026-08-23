import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'metas',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'idConta', coluna: 'id_conta' },
    { nome: 'valorMeta', coluna: 'valor_meta', numero: true },
  ],
})

export const config: Config = {
  path: '/api/metas',
}
