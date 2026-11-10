export const EMOJI_PADRAO = '🏷️'

// o primeiro que casar vale; os nomes chegam sem acento e em minúsculas
const REGRAS: [RegExp, string][] = [
  [/aliment|comida|mercado|restaurante|refeic|lanche/, '🍽️'],
  [/desloc|transporte|carro|combust|gasolina|uber/, '🚗'],
  [/cuidado|beleza|pessoa|barbe|cabelo/, '💇'],
  [/saude|bem-estar|farmacia|medic|academia/, '🩺'],
  [/trabalho|empresa|escritorio/, '💼'],
  [/lazer|divers|viage|festa/, '🎉'],
  [/relacion|namor|presente|familia/, '❤️'],
  [/moradia|casa|aluguel|condominio/, '🏠'],
  [/tecnolog|assinatura|internet|software/, '💻'],
  [/patrimonio|invest|reserva|poupanca/, '🏦'],
  [/divida|fixo|parcela|cartao|emprestimo/, '💳'],
  [/educa|curso|estudo|livro/, '📚'],
  [/\bpets?\b|cachorro|gato/, '🐾'],
  [/roupa|vestu|calcado/, '👕'],
  [/imposto|taxa|tarifa/, '🧾'],
]

export function emojiDaCategoria(nome: string): string {
  const limpo = nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
  return REGRAS.find(([regra]) => regra.test(limpo))?.[1] ?? EMOJI_PADRAO
}
