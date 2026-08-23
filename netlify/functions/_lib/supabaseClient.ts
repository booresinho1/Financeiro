function getConfig() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Credenciais do Supabase não configuradas nas variáveis de ambiente.')
  }
  return { url, anonKey }
}

/**
 * Chama a API REST do Supabase autenticado como o usuário logado (token do
 * próprio usuário), para que o Row Level Security do Postgres se aplique.
 * Nunca usa a service_role key aqui — essa fica só para scripts administrativos.
 */
export async function supabaseFetch(
  userToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const { url, anonKey } = getConfig()
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
}
