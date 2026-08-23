import { supabase } from '@/lib/supabaseClient'

export interface UsuarioAdmin {
  id: string
  email: string
  criadoEm: string
  confirmado: boolean
  desativado: boolean
  uso: Record<string, number>
}

async function requestAdmin<T>(query: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`/api/admin${query}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.erro ?? `Erro na requisição: ${response.status}`)
  }

  return response.json()
}

export const adminRepository = {
  listar: () => requestAdmin<UsuarioAdmin[]>(''),

  desativar: (id: string) => requestAdmin(`?id=${id}&acao=desativar`, { method: 'POST' }),

  reativar: (id: string) => requestAdmin(`?id=${id}&acao=reativar`, { method: 'POST' }),

  excluir: (id: string) => requestAdmin(`?id=${id}`, { method: 'DELETE' }),
}
