import type { Config } from '@netlify/functions'
import { supabaseFetch } from './_lib/supabaseClient'
import { listarContas, listarFaturas, listarTransacoes, obterItem } from './_lib/pluggyClient'
import { montarCartao } from './_lib/pluggyCartoes'
import { exigirDonoDoBanco } from './_lib/acessoBanco'
import { json, erro } from './_lib/respostas'

// o bastante para achar a parcela mais recente de cada compra e o pagamento da última fatura
const DIAS_DE_TRANSACOES = 100

// Só leitura: cartões direto do Pluggy, sem gravar nada no banco.
export default async (req: Request) => {
  try {
    if (req.method !== 'GET') return erro('Método não suportado', 405)
    const negado = await exigirDonoDoBanco(req)
    if (negado) return negado
    const token = req.headers.get('authorization')!.replace('Bearer ', '')

    const resItens = await supabaseFetch(token, 'pluggy_itens?select=item_id')
    if (!resItens.ok) return erro(await resItens.text(), resItens.status)
    const itens = (await resItens.json()) as { item_id: string }[]

    const hoje = new Date().toISOString().slice(0, 10)
    const desde = new Date(Date.now() - DIAS_DE_TRANSACOES * 86_400_000).toISOString().slice(0, 10)

    const porItem = await Promise.all(
      itens.map(async ({ item_id }) => {
        const [item, contas] = await Promise.all([obterItem(item_id), listarContas(item_id)])
        const cartoes = contas.filter((c) => c.type === 'CREDIT')
        return Promise.all(
          cartoes.map(async (conta) => {
            const [faturas, transacoes] = await Promise.all([
              listarFaturas(conta.id),
              listarTransacoes(conta.id, desde),
            ])
            return {
              ...montarCartao(conta, faturas, transacoes, hoje, item.connector.name),
              atualizadoEm: item.lastUpdatedAt ?? null,
            }
          })
        )
      })
    )

    return json(porItem.flat())
  } catch (e) {
    console.error(e)
    return erro(e instanceof Error ? e.message : 'Erro interno', 500)
  }
}

export const config: Config = {
  path: '/api/pluggy-cartoes',
}
