import type { Config } from '@netlify/functions'
import { supabaseFetch } from './_lib/supabaseClient'
import { json, erro } from './_lib/respostas'

// Módulo Desejos. Tudo passa pelo token do usuário: o RLS garante que cada um só vê os seus.

type Linha = Record<string, unknown>

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const texto = (v: unknown, max = 2000) => (typeof v === 'string' && v.trim() ? v.slice(0, max) : null)
const link = (v: unknown) => {
  const t = texto(v)
  return t && /^https?:\/\//i.test(t) ? t : null
}

function desejoParaLinha(d: Linha): Linha {
  const parcelas = d.parcelas as { n?: unknown; valor?: unknown } | undefined
  return {
    id: String(d.id).slice(0, 64),
    nome: String(d.nome ?? '').slice(0, 200),
    classe: String(d.classe ?? '').slice(0, 64),
    valor: Number(d.valor) || 0,
    tipo: d.tipo === 'MENSAL' ? 'MENSAL' : 'UNICO',
    parcelas_n: parcelas ? num(parcelas.n) : null,
    parcelas_valor: parcelas ? num(parcelas.valor) : null,
    vida_util_meses: num(d.vidaUtilMeses),
    g: Number(d.g),
    u: Number(d.u),
    t: Number(d.t),
    data_desejada: texto(d.dataDesejada, 10),
    alternativa: num(d.alternativa),
    link: link(d.link),
    observacao: texto(d.observacao, 5000),
    imagem: link(d.imagem),
    reservado: Math.max(Number(d.reservado) || 0, 0),
    criado_em: texto(d.criadoEm, 40) ?? new Date().toISOString(),
    realizado_em: texto(d.realizadoEm, 10),
    valor_pago: num(d.valorPago),
    descontado: Number(d.descontado) || 0,
  }
}

function linhaParaDesejo(r: Linha): Linha {
  const sem = (o: Linha) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined))
  return sem({
    id: r.id,
    nome: r.nome,
    classe: r.classe,
    valor: Number(r.valor),
    tipo: r.tipo,
    parcelas: r.parcelas_n ? { n: Number(r.parcelas_n), valor: Number(r.parcelas_valor) } : null,
    vidaUtilMeses: num(r.vida_util_meses),
    g: Number(r.g),
    u: Number(r.u),
    t: Number(r.t),
    dataDesejada: r.data_desejada,
    alternativa: num(r.alternativa),
    link: r.link,
    observacao: r.observacao,
    imagem: r.imagem,
    reservado: Number(r.reservado) > 0 ? Number(r.reservado) : null,
    criadoEm: r.criado_em,
    realizadoEm: r.realizado_em,
    valorPago: num(r.valor_pago),
    descontado: r.realizado_em ? Number(r.descontado) : null,
  })
}

function classeParaLinha(c: Linha, posicao: number): Linha {
  return {
    id: String(c.id).slice(0, 64),
    nome: String(c.nome ?? '').slice(0, 80),
    emoji: String(c.emoji ?? '⭐').slice(0, 8),
    exemplo: String(c.exemplo ?? '').slice(0, 200),
    peso: Math.min(Math.max(Number(c.peso) || 1, 0.1), 5),
    pode_parcelar: !!c.podeParcelar,
    so_sobra_livre: !!c.soSobraLivre,
    posicao,
  }
}

async function ok(res: Response): Promise<void> {
  if (!res.ok) throw new Error(await res.text())
}

const UPSERT = { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }

export default async (req: Request) => {
  try {
    const header = req.headers.get('authorization')
    if (!header?.startsWith('Bearer ')) return erro('Não autenticado', 401)
    const token = header.slice('Bearer '.length)

    if (req.method === 'GET') {
      const [rd, rc, rf] = await Promise.all([
        supabaseFetch(token, 'desejos?select=*&order=criado_em.asc'),
        supabaseFetch(token, 'desejos_classes?select=*&order=posicao.asc'),
        supabaseFetch(token, 'desejos_config?select=*'),
      ])
      for (const r of [rd, rc, rf]) if (!r.ok) return erro(await r.text(), r.status)
      const linhas = (await rd.json()) as Linha[]
      const classes = (await rc.json()) as Linha[]
      const [config] = (await rf.json()) as Linha[]
      return json({
        desejos: linhas.filter((r) => !r.realizado_em).map(linhaParaDesejo),
        realizados: linhas.filter((r) => r.realizado_em).map(linhaParaDesejo),
        classes: classes.map((c) => ({
          id: c.id,
          nome: c.nome,
          emoji: c.emoji,
          exemplo: c.exemplo,
          peso: Number(c.peso),
          podeParcelar: c.pode_parcelar,
          soSobraLivre: c.so_sobra_livre,
        })),
        config: config ? { guardado: Number(config.guardado), ordem: config.ordem, sobraManual: num(config.sobra_manual) } : null,
      })
    }

    if (req.method !== 'POST') return erro('Método não suportado', 405)
    const corpo = (await req.json().catch(() => null)) as Linha | null
    if (!corpo || typeof corpo.op !== 'string') return erro('Pedido inválido')

    switch (corpo.op) {
      // grava um ou vários desejos (novos, editados ou realizados)
      case 'salvarDesejos': {
        const lista = Array.isArray(corpo.desejos) ? (corpo.desejos as Linha[]) : []
        if (!lista.length) return json({ ok: true })
        await ok(await supabaseFetch(token, 'desejos?on_conflict=user_id,id', { method: 'POST', headers: UPSERT, body: JSON.stringify(lista.map(desejoParaLinha)) }))
        return json({ ok: true })
      }
      case 'excluirDesejo': {
        await ok(await supabaseFetch(token, `desejos?id=eq.${encodeURIComponent(String(corpo.id))}`, { method: 'DELETE' }))
        return json({ ok: true })
      }
      // a lista de classes é sempre gravada inteira, na ordem
      case 'salvarClasses': {
        const lista = Array.isArray(corpo.classes) ? (corpo.classes as Linha[]) : []
        if (!lista.length) return erro('Precisa de ao menos uma classe')
        const linhas = lista.map(classeParaLinha)
        await ok(await supabaseFetch(token, 'desejos_classes?on_conflict=user_id,id', { method: 'POST', headers: UPSERT, body: JSON.stringify(linhas) }))
        const ids = linhas.map((l) => `"${String(l.id).replace(/"/g, '')}"`).join(',')
        await ok(await supabaseFetch(token, `desejos_classes?id=not.in.(${encodeURIComponent(ids)})`, { method: 'DELETE' }))
        return json({ ok: true })
      }
      case 'salvarConfig': {
        const c = (corpo.config ?? {}) as Linha
        const linha = {
          guardado: Number(c.guardado) || 0,
          ordem: c.ordem === 'custoBeneficio' ? 'custoBeneficio' : 'importancia',
          sobra_manual: c.sobraManual === null || c.sobraManual === undefined ? null : Number(c.sobraManual),
        }
        await ok(await supabaseFetch(token, 'desejos_config?on_conflict=user_id', { method: 'POST', headers: UPSERT, body: JSON.stringify(linha) }))
        return json({ ok: true })
      }
      default:
        return erro('Operação desconhecida')
    }
  } catch (e) {
    console.error(e)
    return erro(e instanceof Error ? e.message : 'Erro interno', 500)
  }
}

export const config: Config = {
  path: '/api/desejos',
}
