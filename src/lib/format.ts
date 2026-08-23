export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatDate(isoDate: string): string {
  const [ano, mes, dia] = isoDate.slice(0, 10).split('-').map(Number)
  const date = new Date(ano, mes - 1, dia)
  return date.toLocaleDateString('pt-BR')
}
