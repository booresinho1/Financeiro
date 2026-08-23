import { sheetsService } from '@/services/sheetsService'
import type { CustoFixo } from '@/types/finance'

const RECURSO = 'custos-fixos'

export type NovoCustoFixo = Omit<CustoFixo, 'id'>

export const custosFixosRepository = {
  listar: () => sheetsService.listar<CustoFixo[]>(RECURSO),

  criar: (custoFixo: NovoCustoFixo) => sheetsService.criar<CustoFixo>(RECURSO, custoFixo),

  atualizar: (id: string, custoFixo: NovoCustoFixo) =>
    sheetsService.atualizar<CustoFixo>(RECURSO, id, custoFixo),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
