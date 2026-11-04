import type { Config } from '@netlify/functions'
import { pluggyFetch } from './_lib/pluggyClient'
import { exigirDonoDoBanco } from './_lib/acessoBanco'
import { json, erro } from './_lib/respostas'

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') return erro('Método não suportado', 405)
    const negado = await exigirDonoDoBanco(req)
    if (negado) return negado

    const { accessToken } = await pluggyFetch<{ accessToken: string }>('/connect_token', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return json({ accessToken })
  } catch (e) {
    console.error(e)
    return erro(e instanceof Error ? e.message : 'Erro interno', 500)
  }
}

export const config: Config = {
  path: '/api/pluggy-token',
}
