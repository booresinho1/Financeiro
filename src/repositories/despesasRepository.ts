import { sheetsService } from '@/services/sheetsService'
import type { Despesa } from '@/types/finance'

const RECURSO = 'despesas'

export type NovaDespesa = Omit<Despesa, 'id'>

export const despesasRepository = {
  listar: () => sheetsService.listar<Despesa[]>(RECURSO),

  criar: (despesa: NovaDespesa) => sheetsService.criar<Despesa>(RECURSO, despesa),

  atualizar: (id: string, despesa: NovaDespesa) =>
    sheetsService.atualizar<Despesa>(RECURSO, id, despesa),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
