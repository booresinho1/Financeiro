import { supabaseFetch } from './supabaseClient'
import { json, erro } from './respostas'

export interface CampoConfig {
  nome: string // nome do campo em camelCase (usado pelo frontend)
  coluna: string // nome da coluna no Postgres (snake_case)
  numero?: boolean // colunas numeric vêm como string do PostgREST; força conversão
  opcional?: boolean
}

export interface CrudConfig {
  tabela: string
  campos: CampoConfig[] // o primeiro deve ser { nome: 'id', coluna: 'id' }
}

function extrairToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}

export function criarCrudDeTabela({ tabela, campos }: CrudConfig) {
  function linhaParaObjeto(row: Record<string, unknown>): Record<string, unknown> {
    const obj: Record<string, unknown> = {}
    for (const campo of campos) {
      const valor = row[campo.coluna]
      obj[campo.nome] = campo.numero && valor !== null && valor !== undefined ? Number(valor) : valor
    }
    return obj
  }

  function objetoParaLinha(obj: Record<string, unknown>): Record<string, unknown> {
    const linha: Record<string, unknown> = {}
    for (const campo of campos) {
      if (campo.nome === 'id') continue
      linha[campo.coluna] = obj[campo.nome] ?? null
    }
    return linha
  }

  function validar(body: Record<string, unknown>): string | null {
    for (const campo of campos) {
      if (campo.nome === 'id' || campo.opcional) continue
      const valor = body[campo.nome]
      if (valor === undefined || valor === null || valor === '') {
        return `Campo obrigatório: ${campo.nome}`
      }
    }
    return null
  }

  async function listar(token: string) {
    const res = await supabaseFetch(token, `${tabela}?select=*&order=id.desc`)
    if (!res.ok) return erro(await res.text(), res.status)
    const rows = (await res.json()) as Record<string, unknown>[]
    return json(rows.map(linhaParaObjeto))
  }

  async function criar(token: string, req: Request) {
    const body = await req.json()
    const erroValidacao = validar(body)
    if (erroValidacao) return erro(erroValidacao)

    const id = crypto.randomUUID().split('-')[0]
    const linha = { id, ...objetoParaLinha(body) }

    const res = await supabaseFetch(token, tabela, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(linha),
    })
    if (!res.ok) return erro(await res.text(), res.status)
    const [criado] = (await res.json()) as Record<string, unknown>[]
    return json(linhaParaObjeto(criado), 201)
  }

  async function atualizar(token: string, req: Request, id: string) {
    const body = await req.json()
    const erroValidacao = validar(body)
    if (erroValidacao) return erro(erroValidacao)

    const linha = objetoParaLinha(body)
    const res = await supabaseFetch(token, `${tabela}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(linha),
    })
    if (!res.ok) return erro(await res.text(), res.status)
    const rows = (await res.json()) as Record<string, unknown>[]
    if (!rows.length) return erro('Registro não encontrado', 404)
    return json(linhaParaObjeto(rows[0]))
  }

  async function excluir(token: string, id: string) {
    const res = await supabaseFetch(token, `${tabela}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) return erro(await res.text(), res.status)
    return json({ ok: true })
  }

  return async (req: Request) => {
    try {
      const token = extrairToken(req)
      if (!token) return erro('Não autenticado', 401)

      const url = new URL(req.url)
      const id = url.searchParams.get('id')

      switch (req.method) {
        case 'GET':
          return await listar(token)
        case 'POST':
          return await criar(token, req)
        case 'PUT':
          if (!id) return erro('Parâmetro id é obrigatório')
          return await atualizar(token, req, id)
        case 'DELETE':
          if (!id) return erro('Parâmetro id é obrigatório')
          return await excluir(token, id)
        default:
          return erro('Método não suportado', 405)
      }
    } catch (e) {
      console.error(e)
      return erro(e instanceof Error ? e.message : 'Erro interno', 500)
    }
  }
}
