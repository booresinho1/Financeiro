import type { Config } from '@netlify/functions'
import { supabaseFetch } from './_lib/supabaseClient'
import { listarContas, listarTransacoes } from './_lib/pluggyClient'
import { entraNaFila, linhaDaFila } from './_lib/pluggyTransacoes'
import { exigirDonoDoBanco } from './_lib/acessoBanco'
import { json, erro } from './_lib/respostas'

const TIPOS_DE_CONTA = ['CREDIT', 'BANK']

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') return erro('Método não suportado', 405)
    const negado = await exigirDonoDoBanco(req)
    if (negado) return negado
    const token = req.headers.get('authorization')!.replace('Bearer ', '')

    const { desde, tipos } = (await req.json().catch(() => ({}))) as {
      desde?: string
      tipos?: string[]
    }
    if (!desde || !/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      return erro('Informe a data inicial (desde)')
    }
    if (!tipos?.length || !tipos.every((t) => TIPOS_DE_CONTA.includes(t))) {
      return erro('Escolha ao menos um tipo de conta')
    }

    const resItens = await supabaseFetch(token, 'pluggy_itens?select=item_id')
    if (!resItens.ok) return erro(await resItens.text(), resItens.status)
    const itens = (await resItens.json()) as { item_id: string }[]

    const contasPluggy: { id: string; nome: string; tipo: string; saldo: number }[] = []
    let novas = 0

    for (const { item_id } of itens) {
      for (const conta of await listarContas(item_id)) {
        contasPluggy.push({ id: conta.id, nome: conta.name, tipo: conta.type, saldo: conta.balance })
        if (!tipos.includes(conta.type)) continue

        const hoje = new Date().toISOString().slice(0, 10)
        const transacoes = (await listarTransacoes(conta.id, desde)).filter((t) =>
          entraNaFila(t, conta.type, hoje)
        )
        if (!transacoes.length) continue

        // ignore-duplicates: transações já vistas (inclusive importadas/ignoradas) não voltam para a fila
        const res = await supabaseFetch(token, 'transacoes_pendentes?on_conflict=user_id,pluggy_id', {
          method: 'POST',
          headers: { Prefer: 'return=representation,resolution=ignore-duplicates' },
          body: JSON.stringify(transacoes.map((t) => linhaDaFila(t, conta, item_id))),
        })
        if (!res.ok) return erro(await res.text(), res.status)
        novas += ((await res.json()) as unknown[]).length
      }
    }

    return json({ novas, contas: contasPluggy })
  } catch (e) {
    console.error(e)
    return erro(e instanceof Error ? e.message : 'Erro interno', 500)
  }
}

export const config: Config = {
  path: '/api/pluggy-sincronizar',
}
