import type { Config } from '@netlify/functions'
import { criarCrudDeTabela } from './_lib/crudSupabase'
import { exigirDonoDoBanco } from './_lib/acessoBanco'
import { erro } from './_lib/respostas'

const crud = criarCrudDeTabela({
  tabela: 'transacoes_pendentes',
  campos: [
    { nome: 'id', coluna: 'id' },
    { nome: 'pluggyId', coluna: 'pluggy_id' },
    { nome: 'itemId', coluna: 'item_id' },
    { nome: 'contaPluggy', coluna: 'conta_pluggy', opcional: true },
    { nome: 'tipoConta', coluna: 'tipo_conta', opcional: true },
    { nome: 'data', coluna: 'data' },
    { nome: 'descricao', coluna: 'descricao' },
    { nome: 'valor', coluna: 'valor', numero: true },
    { nome: 'tipo', coluna: 'tipo' },
    { nome: 'status', coluna: 'status' },
    { nome: 'parcelaNumero', coluna: 'parcela_numero', opcional: true },
    { nome: 'parcelaTotal', coluna: 'parcela_total', opcional: true },
    { nome: 'dataCompra', coluna: 'data_compra', opcional: true },
    { nome: 'idLancamento', coluna: 'id_lancamento', opcional: true },
  ],
})

export default async (req: Request) => {
  try {
    const negado = await exigirDonoDoBanco(req)
    return negado ?? (await crud(req))
  } catch (e) {
    console.error(e)
    return erro(e instanceof Error ? e.message : 'Erro interno', 500)
  }
}

export const config: Config = {
  path: '/api/transacoes-pendentes',
}
