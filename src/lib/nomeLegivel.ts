/** "ALIMENTAÇÃO" → "Alimentação"; nomes já escritos com minúsculas ficam como estão. */
export function nomeLegivel(nome: string): string {
  if (nome !== nome.toLocaleUpperCase('pt-BR')) return nome
  const baixo = nome.toLocaleLowerCase('pt-BR')
  return baixo.charAt(0).toLocaleUpperCase('pt-BR') + baixo.slice(1)
}
