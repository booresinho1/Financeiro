export interface MarcaBanco {
  sigla: string
  fundo: string
  texto: string
  minuscula?: boolean
}

// Cores fixas das marcas: não mudam com o tema. Quando a conta vier do Pluggy,
// dá pra trocar pelo imageUrl do conector.
const MARCAS: { teste: RegExp; marca: MarcaBanco }[] = [
  {
    teste: /nubank|\bnu\b/i,
    marca: { sigla: 'nu', fundo: '#820AD1', texto: '#FFFFFF', minuscula: true },
  },
  {
    teste: /banco do brasil|\bbb\b/i,
    marca: { sigla: 'BB', fundo: '#FCFC30', texto: '#465EFF' },
  },
]

export interface BancoEsperado {
  nome: string
  teste: RegExp
  imageUrl: string
  cor: string
}

// Bancos que o usuário vai conectar pelo Pluggy. Logo e cor vêm do cadastro de
// conectores do Pluggy (GET /connectors), pra aparecerem antes mesmo de conectar.
export const BANCOS_ESPERADOS: BancoEsperado[] = [
  {
    nome: 'Banco do Brasil',
    teste: /banco do brasil/i,
    imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/211.svg',
    cor: '#1194F6',
  },
  {
    nome: 'Nubank',
    teste: /nubank/i,
    imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/212.svg',
    cor: '#8A0FBE',
  },
]

export function marcaDoBanco(nomeConta: string): MarcaBanco | null {
  return MARCAS.find((m) => m.teste.test(nomeConta))?.marca ?? null
}
