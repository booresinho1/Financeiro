import { supabase } from '@/lib/supabaseClient'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const response = await fetch(`/api/${path}`, {
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

export const sheetsService = {
  listar: <T>(recurso: string) => request<T>(recurso),

  criar: <T>(recurso: string, dados: unknown) =>
    request<T>(recurso, { method: 'POST', body: JSON.stringify(dados) }),

  atualizar: <T>(recurso: string, id: string, dados: unknown) =>
    request<T>(`${recurso}?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(dados),
    }),

  excluir: (recurso: string, id: string) =>
    request<{ ok: true }>(`${recurso}?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
