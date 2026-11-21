import type { Config } from '@netlify/functions'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { json, erro } from './_lib/respostas'

// Busca a foto de um produto pelo link da loja (og:image). SÃ³ lÃª a pÃ¡gina; nÃ£o grava nada.

const LIMITE_BYTES = 600_000
const TEMPO_MS = 7000
const MAX_REDIRECIONAMENTOS = 3

async function usuarioLogado(req: Request): Promise<boolean> {
  const header = req.headers.get('authorization')
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!header?.startsWith('Bearer ') || !url || !anonKey) return false
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: header } })
  return res.ok
}

function ipPrivado(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    if (v.startsWith('::ffff:')) return ipPrivado(v.slice(7))
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')
  }
  const [a, b] = ip.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

/** SÃ³ endereÃ§o pÃºblico na web: nada de localhost, rede interna ou outro protocolo. */
export async function enderecoPermitido(u: URL): Promise<boolean> {
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  if (u.username || u.password) return false
  const host = u.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false
  if (isIP(host)) return !ipPrivado(host)
  try {
    const ips = await lookup(host, { all: true })
    return ips.length > 0 && ips.every((x) => !ipPrivado(x.address))
  } catch {
    return false
  }
}

export async function lerPagina(inicial: URL): Promise<{ html: string; url: URL } | null> {
  let atual = inicial
  for (let i = 0; i <= MAX_REDIRECIONAMENTOS; i++) {
    if (!(await enderecoPermitido(atual))) return null
    const res = await fetch(atual, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TEMPO_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FinanceiroBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    })
    if (res.status >= 300 && res.status < 400) {
      const destino = res.headers.get('location')
      if (!destino) return null
      atual = new URL(destino, atual)
      continue
    }
    if (!res.ok || !res.body) return null
    // lÃª sÃ³ o comeÃ§o: as meta tags ficam no <head>
    const leitor = res.body.getReader()
    const partes: Uint8Array[] = []
    let total = 0
    while (total < LIMITE_BYTES) {
      const { done, value } = await leitor.read()
      if (done) break
      partes.push(value)
      total += value.length
      if (new TextDecoder().decode(value).includes('</head>')) break
    }
    leitor.cancel().catch(() => {})
    return { html: new TextDecoder().decode(Buffer.concat(partes)), url: atual }
  }
  return null
}

export function acharImagem(html: string, base: URL): string | null {
  const metas = html.match(/<meta\b[^>]*>/gi) ?? []
  const atributo = (tag: string, nome: string) => tag.match(new RegExp(`\\b${nome}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
  const procurados = ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']
  for (const chave of procurados) {
    for (const tag of metas) {
      const nome = (atributo(tag, 'property') ?? atributo(tag, 'name') ?? '').toLowerCase()
      const conteudo = atributo(tag, 'content')
      if (nome === chave && conteudo) {
        try {
          const u = new URL(conteudo.replace(/&amp;/g, '&'), base)
          if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString()
        } catch {
          // endereÃ§o invÃ¡lido: tenta o prÃ³ximo
        }
      }
    }
  }
  return null
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') return erro('MÃ©todo nÃ£o suportado', 405)
    if (!(await usuarioLogado(req))) return erro('NÃ£o autenticado', 401)
    const corpo = (await req.json().catch(() => null)) as { url?: unknown } | null
    if (typeof corpo?.url !== 'string' || corpo.url.length > 2000) return erro('Link invÃ¡lido')
    let alvo: URL
    try {
      alvo = new URL(corpo.url)
    } catch {
      return erro('Link invÃ¡lido')
    }
    const pagina = await lerPagina(alvo).catch(() => null)
    return json({ imagem: pagina ? acharImagem(pagina.html, pagina.url) : null })
  } catch (e) {
    console.error(e)
    return json({ imagem: null })
  }
}

export const config: Config = {
  path: '/api/foto-do-link',
}
