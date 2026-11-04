import type { Config } from '@netlify/functions'
import { supabaseFetch } from './_lib/supabaseClient'
import { obterItem } from './_lib/pluggyClient'
import { exigirDonoDoBanco } from './_lib/acessoBanco'
import { json, erro } from './_lib/respostas'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface LinhaItem {
  id: string
  item_id: string
  conector: string | null
  criado_em: string
}

function paraObjeto(r: LinhaItem) {
  return { id: r.id, itemId: r.item_id, conector: r.conector, criadoEm: r.criado_em }
}

export default async (req: Request) => {
  try {
    const negado = await exigirDonoDoBanco(req)
    if (negado) return negado
    const token = req.headers.get('authorization')!.replace('Bearer ', '')

    const url = new URL(req.url)

    if (req.method === 'GET') {
      const res = await supabaseFetch(token, 'pluggy_itens?select=*&order=criado_em.desc')
      if (!res.ok) return erro(await res.text(), res.status)
      return json(((await res.json()) as LinhaItem[]).map(paraObjeto))
    }

    if (req.method === 'POST') {
      const { itemId } = (await req.json()) as { itemId?: string }
      if (!itemId || !UUID.test(itemId)) return erro('Código da conexão inválido')
      // confere no Pluggy antes de salvar: código errado não vira conexão fantasma
      const item = await obterItem(itemId)
      const res = await supabaseFetch(token, 'pluggy_itens?on_conflict=user_id,item_id', {
        method: 'POST',
        headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify({
          id: crypto.randomUUID().split('-')[0],
          item_id: itemId,
          conector: item.connector.name,
        }),
      })
      if (!res.ok) return erro(await res.text(), res.status)
      const [criado] = (await res.json()) as LinhaItem[]
      return json(paraObjeto(criado), 201)
    }

    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id')
      if (!id) return erro('Parâmetro id é obrigatório')
      const filtro = `pluggy_itens?id=eq.${encodeURIComponent(id)}`

      // a fila ainda não tratada sai junto; o que já foi importado ou ignorado fica no histórico
      const resItem = await supabaseFetch(token, `${filtro}&select=item_id`)
      if (!resItem.ok) return erro(await resItem.text(), resItem.status)
      const [linha] = (await resItem.json()) as { item_id: string }[]
      if (linha) {
        const resFila = await supabaseFetch(
          token,
          `transacoes_pendentes?item_id=eq.${encodeURIComponent(linha.item_id)}&status=eq.PENDENTE`,
          { method: 'DELETE' }
        )
        if (!resFila.ok) return erro(await resFila.text(), resFila.status)
      }

      const res = await supabaseFetch(token, filtro, { method: 'DELETE' })
      if (!res.ok) return erro(await res.text(), res.status)
      return json({ ok: true })
    }

    return erro('Método não suportado', 405)
  } catch (e) {
    console.error(e)
    return erro(e instanceof Error ? e.message : 'Erro interno', 500)
  }
}

export const config: Config = {
  path: '/api/pluggy-itens',
}
