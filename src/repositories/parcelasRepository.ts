import { sheetsService } from '@/services/sheetsService'
import type { Parcela } from '@/types/finance'

const RECURSO = 'parcelas'

export type NovaParcela = Omit<Parcela, 'id'>

export const parcelasRepository = {
  listar: () => sheetsService.listar<Parcela[]>(RECURSO),

  criar: (parcela: NovaParcela) => sheetsService.criar<Parcela>(RECURSO, parcela),

  atualizar: (id: string, parcela: NovaParcela) =>
    sheetsService.atualizar<Parcela>(RECURSO, id, parcela),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
