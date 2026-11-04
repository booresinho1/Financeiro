export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

const PALAVRAS_MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'em', 'com'])

/**
 * Nome cadastrado todo em maiúsculas ("ALIMENTAÇÃO") vira "Alimentação" pra exibir.
 * Nomes com caixa mista são respeitados como estão (siglas, marcas).
 */
export function nomeBonito(nome: string): string {
  if (!nome || nome !== nome.toUpperCase()) return nome
  return nome
    .toLowerCase()
    .split(' ')
    .map((p, i) => (i > 0 && PALAVRAS_MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}

export function formatDate(isoDate: string): string {
  const [ano, mes, dia] = isoDate.slice(0, 10).split('-').map(Number)
  const date = new Date(ano, mes - 1, dia)
  return date.toLocaleDateString('pt-BR')
}
