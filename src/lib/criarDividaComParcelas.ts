import { dividasRepository, type NovaDivida } from '@/repositories/dividasRepository'
import { parcelasRepository } from '@/repositories/parcelasRepository'
import { somarMeses } from '@/lib/datas'

export async function criarDividaComParcelas(dados: NovaDivida) {
  const divida = await dividasRepository.criar(dados)

  for (let i = 0; i < dados.numParcelas; i++) {
    await parcelasRepository.criar({
      idDivida: divida.id,
      numeroParcela: i + 1,
      dataVencimento: somarMeses(dados.primeiroVencimento, i),
      valorPrevisto: dados.valorParcela,
      status: 'PENDENTE',
    })
  }

  return divida
}
