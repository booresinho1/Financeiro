import { erro } from './respostas'

// Dados de banco são só do dono da conta: a rota gratuita do MeuPluggy atende apenas a ele.
const EMAIL_DONO_DO_BANCO = 'booresinho1@gmail.com'

async function obterEmailDoToken(token: string): Promise<string | null> {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Credenciais do Supabase não configuradas nas variáveis de ambiente.')
  }
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const dados = (await res.json()) as { email?: string }
  return dados.email ?? null
}

/** Devolve a resposta de erro para quem não pode ver dados de banco, ou null para seguir. */
export async function exigirDonoDoBanco(req: Request): Promise<Response | null> {
  const header = req.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return erro('Não autenticado', 401)
  const email = await obterEmailDoToken(header.slice('Bearer '.length))
  if (email !== EMAIL_DONO_DO_BANCO) return erro('Acesso restrito à conta do dono do banco', 403)
  return null
}
