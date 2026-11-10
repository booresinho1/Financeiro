import type { Despesa, Entrada, TransacaoPendente } from '@/types/finance'

export interface SugestaoCategoria {
  categoria: string
  subcategoria: string
  /** só para entrada */
  conta?: string
  /** quantos lançamentos parecidos você já tem com essa mesma classificação */
  vezes: number
  /** quantos lançamentos parecidos existem no total */
  totalParecidos: number
  /** descrição de um dos lançamentos usados, para mostrar de onde veio */
  exemplo: string
  /** alta: dá para importar com um clique */
  confianca: 'alta' | 'media'
}

// ruído que o banco acrescenta e que não identifica o lugar
const PREFIXOS = /^(COMPRA C\/CARTAO|COMPRA CARTAO|PIX - (ENVIADO|RECEBIDO)|PIX (ENVIADO|RECEBIDO)|PAGTO|PAGAMENTO|TED|DOC|TRANSF(ERENCIA)?)\b/i
const RUIDO = new Set(['BR', 'SAO', 'PAULO', 'FORTALEZA', 'CE', 'SP', 'RJ', 'LTDA', 'ME', 'EPP', 'SA', 'PARC', 'COM', 'DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'EM', 'A'])

function semAcento(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Palavras que identificam o estabelecimento: sem data, hora, parcela, número e ruído. */
export function palavrasDoEstabelecimento(descricao: string): string[] {
  let d = semAcento(descricao).toUpperCase().replace(/\*/g, ' ')
  d = d.replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, ' ').replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ')
  d = d.replace(PREFIXOS, ' ')
  const palavras = d
    .split(/[^A-Z0-9]+/)
    .filter((p) => p.length >= 3 && !/^\d+$/.test(p) && !RUIDO.has(p))
  return [...new Set(palavras)]
}

function parecido(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const comuns = a.filter((p) => b.includes(p)).length
  return comuns / Math.max(a.length, b.length, 1) // 1 = mesmas palavras; 0,5 = metade
}

const LIMITE_PARECIDO = 0.5

interface Historico {
  descricao: string
  categoria: string
  subcategoria: string
  conta?: string
}

/**
 * Classificação mais provável para uma transação do banco, pelo que você já fez com o mesmo
 * estabelecimento. Sem nenhum lançamento parecido, não sugere nada.
 */
export function sugerirCategoria(
  t: TransacaoPendente,
  despesas: Despesa[],
  entradas: Entrada[]
): SugestaoCategoria | null {
  const palavras = palavrasDoEstabelecimento(t.descricao)
  if (!palavras.length) return null

  const base: Historico[] =
    t.tipo === 'DESPESA'
      ? despesas
          .filter((d) => d.categoria && d.subcategoria)
          .map((d) => ({ descricao: d.descricao, categoria: d.categoria, subcategoria: d.subcategoria }))
      : entradas
          .filter((e) => e.categoria)
          .map((e) => ({ descricao: e.descricao, categoria: e.categoria, subcategoria: '', conta: e.contaDestino }))

  const grupos = new Map<string, { h: Historico; peso: number; vezes: number }>()
  let totalParecidos = 0
  for (const h of base) {
    const sim = parecido(palavras, palavrasDoEstabelecimento(h.descricao))
    if (sim < LIMITE_PARECIDO) continue
    totalParecidos++
    const chave = `${h.categoria}|${h.subcategoria}|${h.conta ?? ''}`
    const g = grupos.get(chave) ?? { h, peso: 0, vezes: 0 }
    g.peso += sim
    g.vezes++
    grupos.set(chave, g)
  }
  if (!grupos.size) return null

  const melhor = [...grupos.values()].sort((a, b) => b.peso - a.peso || b.vezes - a.vezes)[0]
  const dominante = melhor.vezes / totalParecidos >= 0.75
  return {
    categoria: melhor.h.categoria,
    subcategoria: melhor.h.subcategoria,
    conta: melhor.h.conta,
    vezes: melhor.vezes,
    totalParecidos,
    exemplo: melhor.h.descricao,
    confianca: melhor.vezes >= 2 && dominante ? 'alta' : 'media',
  }
}
