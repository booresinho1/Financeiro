import type { Orcamento } from '@/types/finance'
import type { Dre } from '@/lib/dre'

export type NivelSinal = 'ok' | 'atencao' | 'critico'

export interface SinalCategoria {
  nome: string
  gasto: number
  referencia: number
  tipoReferencia: 'orcamento' | 'media'
  /** gasto / referência, em % */
  uso: number
  nivel: NivelSinal
  /** quanto o gasto passa da referência, em R$ */
  excesso: number
  emAndamento: boolean
}

const MESES_MEDIA = 3
// abaixo disso o desvio não muda a vida de ninguém
const EXCESSO_MINIMO = 30
const GASTO_MINIMO = 50

/** Orçamento mensal por categoria: o da categoria inteira, ou a soma dos de subcategoria. */
export function orcamentoPorCategoria(orcamentos: Orcamento[]): Map<string, number> {
  const inteiro = new Map<string, number>()
  const porSub = new Map<string, number>()
  for (const o of orcamentos) {
    if (o.valorOrcado <= 0) continue
    const alvo = o.subcategoria ? porSub : inteiro
    alvo.set(o.categoria, (alvo.get(o.categoria) ?? 0) + o.valorOrcado)
  }
  for (const [c, v] of porSub) if (!inteiro.has(c)) inteiro.set(c, v)
  return inteiro
}

/**
 * Compara o gasto de cada categoria no mês `i` com o orçamento (se houver) ou com a média dos 3 meses antes.
 * No mês em andamento não projeta pelo ritmo: conta pago no começo do mês (aluguel) viraria alarme falso.
 */
export function sinaisDoMes(
  dre: Dre,
  i: number,
  orcamentos: Map<string, number>,
  emAndamento: boolean
): Map<string, SinalCategoria> {
  const sinais = new Map<string, SinalCategoria>()

  for (const l of dre.despesas) {
    const gasto = l.porMes[i]
    if (gasto <= 0) continue
    const anteriores = l.porMes.slice(Math.max(0, i - MESES_MEDIA), i)
    const media = anteriores.length ? anteriores.reduce((t, v) => t + v, 0) / anteriores.length : 0
    const orcado = orcamentos.get(l.nome)
    const referencia = orcado ?? media
    if (referencia <= 0) continue

    const uso = (gasto / referencia) * 100
    const excesso = Math.max(gasto - referencia, 0)
    const nivel: NivelSinal =
      gasto < GASTO_MINIMO
        ? 'ok'
        : uso >= (orcado ? 100 : 125) && excesso >= EXCESSO_MINIMO
          ? 'critico'
          : uso >= (orcado ? 85 : 110)
            ? 'atencao'
            : 'ok'

    sinais.set(l.nome, {
      nome: l.nome,
      gasto,
      referencia,
      tipoReferencia: orcado ? 'orcamento' : 'media',
      uso,
      nivel,
      excesso,
      emAndamento,
    })
  }
  return sinais
}

/** As categorias que mais passaram do planejado, da que mais pesa para a que menos pesa. */
export function ondeAgir(sinais: Map<string, SinalCategoria>, limite = 3): SinalCategoria[] {
  return [...sinais.values()]
    .filter((s) => s.nivel !== 'ok')
    .sort((a, b) => b.excesso - a.excesso || b.uso - a.uso)
    .slice(0, limite)
}
