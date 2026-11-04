const PLUGGY_API = 'https://api.pluggy.ai'

function getCredenciais() {
  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Credenciais do Pluggy não configuradas nas variáveis de ambiente.')
  }
  return { clientId, clientSecret }
}

// a apiKey vale 2h; reaproveita enquanto a função estiver quente
let apiKeyCache: { valor: string; expiraEm: number } | null = null

async function obterApiKey(): Promise<string> {
  if (apiKeyCache && apiKeyCache.expiraEm > Date.now()) return apiKeyCache.valor
  const res = await fetch(`${PLUGGY_API}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getCredenciais()),
  })
  if (!res.ok) throw new Error(`Falha ao autenticar no Pluggy: ${res.status}`)
  const { apiKey } = (await res.json()) as { apiKey: string }
  apiKeyCache = { valor: apiKey, expiraEm: Date.now() + 90 * 60_000 }
  return apiKey
}

export async function pluggyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = await obterApiKey()
  const res = await fetch(`${PLUGGY_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey, ...init?.headers },
  })
  if (!res.ok) throw new Error(`Erro na API do Pluggy (${path}): ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

export interface PluggyConta {
  id: string
  name: string
  type: 'BANK' | 'CREDIT' | string
  subtype?: string
  number?: string | null
  balance: number
  creditData?: {
    creditLimit?: number
    availableCreditLimit?: number
    balanceCloseDate?: string
    balanceDueDate?: string
    minimumPayment?: number
    brand?: string | null
    level?: string | null
  } | null
}

export interface PluggyFatura {
  id: string
  dueDate: string
  billClosingDate?: string | null
  totalAmount: number
  minimumPaymentAmount?: number | null
  financeCharges?: { type: string; amount: number }[] | null
}

export interface PluggyItem {
  id: string
  status: string
  lastUpdatedAt?: string
  connector: { id: number; name: string; imageUrl?: string; primaryColor?: string }
}

export function obterItem(itemId: string): Promise<PluggyItem> {
  return pluggyFetch<PluggyItem>(`/items/${itemId}`)
}

export interface PluggyTransacao {
  id: string
  description: string
  amount: number
  date: string
  type: 'DEBIT' | 'CREDIT'
  status?: 'PENDING' | 'POSTED'
  category?: string | null
  creditCardMetadata?: {
    installmentNumber?: number
    totalInstallments?: number
    purchaseDate?: string
    cardNumber?: string | null
  } | null
}

export async function listarContas(itemId: string): Promise<PluggyConta[]> {
  const { results } = await pluggyFetch<{ results: PluggyConta[] }>(`/accounts?itemId=${itemId}`)
  return results
}

export async function listarFaturas(accountId: string): Promise<PluggyFatura[]> {
  const todas: PluggyFatura[] = []
  let pagina = 1
  let totalPaginas = 1
  do {
    const r = await pluggyFetch<{ results: PluggyFatura[]; totalPages: number }>(
      `/bills?accountId=${accountId}&page=${pagina}`
    )
    todas.push(...r.results)
    totalPaginas = r.totalPages
    pagina++
  } while (pagina <= totalPaginas)
  return todas
}

export async function listarTransacoes(accountId: string, desde: string): Promise<PluggyTransacao[]> {
  const todas: PluggyTransacao[] = []
  // paginação por cursor: `next` já vem como query string pronta (ou null no fim)
  let proxima: string | null = `?accountId=${accountId}&dateFrom=${desde}`
  while (proxima) {
    const r: { results: PluggyTransacao[]; next: string | null } = await pluggyFetch(
      `/v2/transactions${proxima}`
    )
    todas.push(...r.results)
    proxima = r.next
  }
  return todas.filter((t) => t.date.slice(0, 10) >= desde)
}
