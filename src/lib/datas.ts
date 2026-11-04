export function somarMeses(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1 + meses, dia))
  return data.toISOString().slice(0, 10)
}

/** A data de hoje no relógio de quem usa: toISOString viraria o dia às 21h em Fortaleza. */
export function hojeIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
