import type { Config } from '@netlify/functions'
import { json, erro } from './_lib/respostas'

const EMAIL_MASTER = 'booresinho1@gmail.com'
const TABELAS_USO = ['despesas', 'entradas', 'contas', 'dividas', 'custos_fixos']

function getConfig() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) {
    throw new Error('Credenciais do Supabase não configuradas.')
  }
  return { url, anonKey, serviceKey }
}

async function obterEmailDoToken(token: string): Promise<string | null> {
  const { url, anonKey } = getConfig()
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const dados = await res.json()
  return dados.email ?? null
}

async function exigirMaster(req: Request): Promise<Response | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return erro('Não autenticado', 401)
  const token = header.slice('Bearer '.length)
  const email = await obterEmailDoToken(token)
  if (email !== EMAIL_MASTER) return erro('Acesso restrito à conta administradora', 403)
  return null
}

async function contarLinhas(tabela: string, userId: string): Promise<number> {
  const { url, serviceKey } = getConfig()
  const res = await fetch(`${url}/rest/v1/${tabela}?select=id&user_id=eq.${userId}&limit=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  })
  const contentRange = res.headers.get('content-range') // formato "0-0/42"
  const total = contentRange?.split('/')[1]
  return total ? Number(total) : 0
}

async function listarUsuarios() {
  const { url, serviceKey } = getConfig()
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (!res.ok) return erro(await res.text(), res.status)
  const dados = await res.json()
  const usuarios = dados.users ?? []

  const comUso = await Promise.all(
    usuarios.map(async (u: Record<string, unknown>) => {
      const uso: Record<string, number> = {}
      for (const tabela of TABELAS_USO) {
        uso[tabela] = await contarLinhas(tabela, u.id as string)
      }
      return {
        id: u.id,
        email: u.email,
        criadoEm: u.created_at,
        confirmado: Boolean(u.email_confirmed_at),
        desativado: Boolean(u.banned_until) && new Date(u.banned_until as string) > new Date(),
        uso,
      }
    })
  )

  return json(comUso)
}

async function alterarStatus(id: string, desativar: boolean) {
  const { url, serviceKey } = getConfig()
  const res = await fetch(`${url}/auth/v1/admin/users/${id}`, {
    method: 'PUT',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ban_duration: desativar ? '876000h' : 'none' }),
  })
  if (!res.ok) return erro(await res.text(), res.status)
  return json({ ok: true })
}

async function excluirUsuario(id: string) {
  const { url, serviceKey } = getConfig()
  const res = await fetch(`${url}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  if (!res.ok) return erro(await res.text(), res.status)
  return json({ ok: true })
}

export default async (req: Request) => {
  try {
    const negado = await exigirMaster(req)
    if (negado) return negado

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const acao = url.searchParams.get('acao')

    if (req.method === 'GET') return await listarUsuarios()

    if (req.method === 'POST' && id && (acao === 'desativar' || acao === 'reativar')) {
      return await alterarStatus(id, acao === 'desativar')
    }

    if (req.method === 'DELETE' && id) return await excluirUsuario(id)

    return erro('Requisição inválida', 400)
  } catch (e) {
    console.error(e)
    return erro(e instanceof Error ? e.message : 'Erro interno', 500)
  }
}

export const config: Config = {
  path: '/api/admin',
}
