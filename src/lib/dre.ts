import type { Despesa, Entrada } from '@/types/finance'
import { somarMeses } from '@/lib/datas'
import { nomeLegivel } from '@/lib/nomeLegivel'

export interface LinhaDre {
  nome: string
  porMes: number[]
  total: number
  filhos?: LinhaDre[]
}

export interface Dre {
  meses: string[]
  receitas: LinhaDre[]
  totalReceitas: number[]
  despesas: LinhaDre[]
  /** compromissos do mês (fixos e parcelas) que ainda não viraram despesa */
  aLancar: number[]
  totalDespesas: number[]
  resultado: number[]
  margem: (number | null)[]
}

/** Os `quantidade` meses que terminam em `ultimo` (YYYY-MM), do mais antigo ao mais novo. */
export function mesesAte(ultimo: string, quantidade: number): string[] {
  return Array.from({ length: quantidade }, (_, i) =>
    somarMeses(`${ultimo}-01`, i - (quantidade - 1)).slice(0, 7)
  )
}

function somar(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i])
}

function montarLinhas(
  itens: { mes: number; nome: string; sub?: string; valor: number }[],
  tamanho: number
): LinhaDre[] {
  const grupos = new Map<string, { porMes: number[]; subs: Map<string, number[]> }>()
  for (const { mes, nome, sub, valor } of itens) {
    const g = grupos.get(nome) ?? { porMes: new Array(tamanho).fill(0), subs: new Map() }
    g.porMes[mes] += valor
    if (sub !== undefined) {
      const s = g.subs.get(sub) ?? new Array(tamanho).fill(0)
      s[mes] += valor
      g.subs.set(sub, s)
    }
    grupos.set(nome, g)
  }
  const soma = (v: number[]) => v.reduce((t, x) => t + x, 0)
  return [...grupos.entries()]
    .map(([nome, g]) => ({
      nome,
      porMes: g.porMes,
      total: soma(g.porMes),
      filhos: g.subs.size
        ? [...g.subs.entries()]
            .map(([n, porMes]) => ({ nome: n, porMes, total: soma(porMes) }))
            .sort((x, y) => y.total - x.total)
        : undefined,
    }))
    .sort((x, y) => y.total - x.total)
}

export type TipoNoFluxo = 'receita' | 'faltou' | 'categoria' | 'outras' | 'aLancar' | 'sobra' | 'sub'

export interface NoFluxo {
  id: string
  nome: string
  valor: number
  tipo: TipoNoFluxo
  /** posição na paleta categórica, só para as categorias em destaque */
  corIndice?: number
  filhos: NoFluxo[]
}

export interface FluxoDoMes {
  /** lado esquerdo: o que entrou, e o que faltou se o mês fechou no vermelho */
  entradas: NoFluxo[]
  /** soma das entradas, igual à soma das saídas */
  total: number
  receitas: number
  saidas: NoFluxo[]
}

/**
 * De onde veio e para onde foi o dinheiro de um mês: receitas → total → categorias → subcategorias.
 * As maiores categorias aparecem sozinhas; o resto vira "Outras categorias".
 */
export function fluxoDoMes(dre: Dre, i: number, maxCategorias = 5, maxSubs = 3): FluxoDoMes {
  const resultado = dre.resultado[i]
  const entradas: NoFluxo[] = dre.receitas
    .filter((l) => l.porMes[i] > 0)
    .map((l) => ({ id: `r:${l.nome}`, nome: l.nome, valor: l.porMes[i], tipo: 'receita', filhos: [] }))
  if (resultado < 0) entradas.push({ id: 'faltou', nome: 'Faltou', valor: -resultado, tipo: 'faltou', filhos: [] })

  const categorias = dre.despesas.filter((l) => l.porMes[i] > 0).sort((a, b) => b.porMes[i] - a.porMes[i])
  const subsDe = (l: LinhaDre): NoFluxo[] => {
    const subs = (l.filhos ?? []).filter((f) => f.porMes[i] > 0).sort((a, b) => b.porMes[i] - a.porMes[i])
    if (subs.length < 2) return []
    const vistas = subs.length > maxSubs + 1 ? subs.slice(0, maxSubs) : subs
    const resto = subs.slice(vistas.length).reduce((t, f) => t + f.porMes[i], 0)
    const nos: NoFluxo[] = vistas.map((f) => ({
      id: `s:${l.nome}:${f.nome}`, nome: f.nome, valor: f.porMes[i], tipo: 'sub', filhos: [],
    }))
    if (resto > 0)
      nos.push({ id: `s:${l.nome}:+`, nome: `+${subs.length - vistas.length} outras`, valor: resto, tipo: 'sub', filhos: [] })
    return nos
  }

  // "Outras" só vale a pena se juntar mais de uma categoria
  const destaque = categorias.length > maxCategorias + 1 ? categorias.slice(0, maxCategorias) : categorias.slice(0, maxCategorias + 1)
  const demais = categorias.slice(destaque.length)
  // a cor segue a categoria (posição na janela inteira), não a posição dela neste mês
  const saidas: NoFluxo[] = destaque.map((l) => {
    const posicao = dre.despesas.indexOf(l)
    return {
      id: `d:${l.nome}`, nome: l.nome, valor: l.porMes[i], tipo: 'categoria',
      corIndice: posicao < 5 ? posicao : undefined, filhos: subsDe(l),
    }
  })
  if (demais.length)
    saidas.push({
      id: 'outras',
      nome: `Outras (${demais.length})`,
      valor: demais.reduce((t, l) => t + l.porMes[i], 0),
      tipo: 'outras',
      filhos: [],
    })
  if (dre.aLancar[i] > 0)
    saidas.push({ id: 'aLancar', nome: 'Ainda a lançar', valor: dre.aLancar[i], tipo: 'aLancar', filhos: [] })
  if (resultado > 0) saidas.push({ id: 'sobra', nome: 'Sobrou', valor: resultado, tipo: 'sobra', filhos: [] })

  return {
    entradas,
    total: entradas.reduce((t, e) => t + e.valor, 0),
    receitas: dre.totalReceitas[i],
    saidas,
  }
}

export interface Insight {
  tom: 'bom' | 'atencao' | 'neutro'
  texto: string
}

/** Até 3 frases curtas comparando o mês com o anterior da janela. */
export function insightsDoMes(dre: Dre, i: number): Insight[] {
  const lista: Insight[] = []
  const desp = dre.totalDespesas[i]
  const rec = dre.totalReceitas[i]
  const maior = [...dre.despesas].sort((a, b) => b.porMes[i] - a.porMes[i])[0]
  if (maior && maior.porMes[i] > 0 && desp > 0)
    lista.push({
      tom: 'neutro',
      texto: `${nomeLegivel(maior.nome)} levou ${Math.round((maior.porMes[i] / desp) * 100)}% das despesas`,
    })
  if (i > 0) {
    const antes = dre.totalDespesas[i - 1]
    if (antes > 0 && desp > 0) {
      const delta = Math.round(((desp - antes) / antes) * 100)
      if (delta !== 0)
        lista.push({
          tom: delta < 0 ? 'bom' : 'atencao',
          texto: `Gastou ${Math.abs(delta)}% ${delta < 0 ? 'menos' : 'mais'} que no mês anterior`,
        })
    }
    const subiu = dre.despesas
      .map((l) => ({ nome: l.nome, d: l.porMes[i] - l.porMes[i - 1] }))
      .sort((a, b) => b.d - a.d)[0]
    if (subiu && subiu.d > 0 && lista.length < 3)
      lista.push({ tom: 'atencao', texto: `${nomeLegivel(subiu.nome)} foi o que mais subiu (+${formatarCurto(subiu.d)})` })
  }
  if (rec > 0 && lista.length < 3 && dre.resultado[i] < 0)
    lista.push({ tom: 'atencao', texto: 'As despesas passaram da receita do mês' })
  return lista.slice(0, 3)
}

function formatarCurto(v: number): string {
  return `R$ ${Math.round(v).toLocaleString('pt-BR')}`
}

/** DRE por competência: cada valor entra no mês da data do lançamento (compra, não pagamento). */
export function montarDre(
  despesas: Despesa[],
  entradas: Entrada[],
  meses: string[],
  aLancarPorMes: Record<string, number> = {}
): Dre {
  const indice = new Map(meses.map((m, i) => [m, i]))
  const n = meses.length

  const linhasReceita = montarLinhas(
    entradas.flatMap((e) => {
      const mes = indice.get(e.data.slice(0, 7))
      return mes === undefined ? [] : [{ mes, nome: e.categoria || 'Sem categoria', valor: e.valor }]
    }),
    n
  )
  const linhasDespesa = montarLinhas(
    despesas.flatMap((d) => {
      const mes = indice.get(d.data.slice(0, 7))
      return mes === undefined
        ? []
        : [{ mes, nome: d.categoria || 'Sem categoria', sub: d.subcategoria || 'Sem subcategoria', valor: d.valor }]
    }),
    n
  )

  const zeros = () => new Array<number>(n).fill(0)
  const totalReceitas = linhasReceita.reduce((t, l) => somar(t, l.porMes), zeros())
  const gastas = linhasDespesa.reduce((t, l) => somar(t, l.porMes), zeros())
  const aLancar = meses.map((m) => aLancarPorMes[m] ?? 0)
  const totalDespesas = somar(gastas, aLancar)
  const resultado = totalReceitas.map((r, i) => r - totalDespesas[i])
  const margem = resultado.map((r, i) => (totalReceitas[i] > 0 ? (r / totalReceitas[i]) * 100 : null))

  return {
    meses,
    receitas: linhasReceita,
    totalReceitas,
    despesas: linhasDespesa,
    aLancar,
    totalDespesas,
    resultado,
    margem,
  }
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/** "2026-11" → "nov/26" */
export function rotuloMes(mes: string): string {
  return `${MESES_CURTOS[Number(mes.slice(5)) - 1]}/${mes.slice(2, 4)}`
}

/** "2026-11" → "Novembro" */
export function nomeDoMes(mes: string): string {
  return MESES_LONGOS[Number(mes.slice(5)) - 1]
}
