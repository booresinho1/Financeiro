import { formatCurrency } from '@/lib/format'
import type { NovaDespesa } from '@/repositories/despesasRepository'
import type { TransacaoPendente } from '@/types/finance'

/** Pedaço de uma nota dividida. O valor é o texto do campo; a última parte recebe o que faltar. */
export interface ParteDivisao {
  id: string
  valor: string
  categoria: string
  subcategoria: string
}

const SEPARADOR_IDS = ','

export function novaParte(parcial: Partial<ParteDivisao> = {}): ParteDivisao {
  return { id: crypto.randomUUID(), valor: '', categoria: '', subcategoria: '', ...parcial }
}

// a conta é feita em centavos: 0,1 + 0,2 em reais não fecha exato
function emCentavos(valor: number): number {
  return Math.round(valor * 100)
}

function centavosDoCampo(texto: string): number {
  const valor = Number(texto.replace(',', '.'))
  return Number.isFinite(valor) ? emCentavos(valor) : 0
}

/** Valor de cada parte, em reais. A última fecha a conta e pode ficar negativa se passar do total. */
export function valoresDasPartes(partes: ParteDivisao[], total: number): number[] {
  const digitadas = partes.slice(0, -1).map((p) => centavosDoCampo(p.valor))
  const restante = emCentavos(total) - digitadas.reduce((s, v) => s + v, 0)
  return [...digitadas, restante].map((v) => v / 100)
}

export function erroDaDivisao(partes: ParteDivisao[], total: number): string | null {
  const valores = valoresDasPartes(partes, total)
  const ultimo = valores[valores.length - 1]
  if (ultimo < 0) return `As partes passam do total em ${formatCurrency(-ultimo)}.`
  if (valores.some((v) => v <= 0)) return 'Cada parte precisa ter um valor maior que zero.'
  if (partes.some((p) => !p.categoria || !p.subcategoria)) {
    return 'Escolha a categoria e a subcategoria de cada parte.'
  }
  return null
}

/** A parte que era a última passa a ser digitada, começando com o valor que ela já mostrava. */
export function adicionarParte(partes: ParteDivisao[], total: number): ParteDivisao[] {
  const valores = valoresDasPartes(partes, total)
  const ultimaIndice = partes.length - 1
  return [
    ...partes.map((p, i) =>
      i === ultimaIndice ? { ...p, valor: Math.max(valores[i], 0).toFixed(2) } : p
    ),
    novaParte(),
  ]
}

export function despesasDaDivisao(t: TransacaoPendente, partes: ParteDivisao[]): NovaDespesa[] {
  const valores = valoresDasPartes(partes, t.valor)
  return partes.map((p, i) => ({
    data: t.data,
    descricao: `${t.descricao} (${i + 1}/${partes.length})`,
    valor: valores[i],
    categoria: p.categoria,
    subcategoria: p.subcategoria,
  }))
}

/** A transação dividida aponta para várias despesas; a coluna guarda os ids juntos. */
export function juntarIds(ids: string[]): string {
  return ids.join(SEPARADOR_IDS)
}

export function separarIds(idLancamento: string | null | undefined): string[] {
  return idLancamento ? idLancamento.split(SEPARADOR_IDS) : []
}
