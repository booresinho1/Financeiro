import type { Config } from '@netlify/functions'
import { supabaseFetch } from './_lib/supabaseClient'
import { listarContas, obterItem } from './_lib/pluggyClient'
import { exigirDonoDoBanco } from './_lib/acessoBanco'
import { json, erro } from './_lib/respostas'

// Só leitura: saldos e dados de cartão direto do Pluggy, sem gravar nada no banco.
export default async (req: Request) => {
  try {
    if (req.method !== 'GET') return erro('Método não suportado', 405)
    const negado = await exigirDonoDoBanco(req)
    if (negado) return negado
    const token = req.headers.get('authorization')!.replace('Bearer ', '')

    const resItens = await supabaseFetch(token, 'pluggy_itens?select=item_id')
    if (!resItens.ok) return erro(await resItens.text(), resItens.status)
    const itens = (await resItens.json()) as { item_id: string }[]

    const bancos = await Promise.all(
      itens.map(async ({ item_id }) => {
        const [item, contas] = await Promise.all([obterItem(item_id), listarContas(item_id)])
        return {
          itemId: item_id,
          conectorId: item.connector.id,
          nome: item.connector.name,
          imageUrl: item.connector.imageUrl ?? null,
          cor: item.connector.primaryColor ? `#${item.connector.primaryColor}` : null,
          status: item.status,
          atualizadoEm: item.lastUpdatedAt ?? null,
          contas: contas.map((c) => ({
            id: c.id,
            nome: c.name,
            tipo: c.type,
            subtipo: c.subtype ?? null,
            saldo: c.balance,
            limite: c.creditData?.creditLimit ?? null,
            limiteDisponivel: c.creditData?.availableCreditLimit ?? null,
            vencimento: c.creditData?.balanceDueDate?.slice(0, 10) ?? null,
            fechamento: c.creditData?.balanceCloseDate?.slice(0, 10) ?? null,
          })),
        }
      })
    )

    return json(bancos)
  } catch (e) {
    console.error(e)
    return erro(e instanceof Error ? e.message : 'Erro interno', 500)
  }
}

export const config: Config = {
  path: '/api/pluggy-saldos',
}
