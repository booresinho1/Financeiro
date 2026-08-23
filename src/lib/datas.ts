export function somarMeses(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1 + meses, dia))
  return data.toISOString().slice(0, 10)
}

export function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}
