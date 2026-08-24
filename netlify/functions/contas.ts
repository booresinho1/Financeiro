import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'

export default criarCrudDeTabela({
  tabela: 'contas',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'nome', coluna: 'nome' },
    { nome: 'tipo', coluna: 'tipo' },
    { nome: 'saldoInicial', coluna: 'saldo_inicial', numero: true },
    { nome: 'dataSaldoInicial', coluna: 'data_saldo_inicial', opcional: true },
    { nome: 'ativa', coluna: 'ativa' },
  ],
})

export const config: Config = {
  path: '/api/contas',
}
