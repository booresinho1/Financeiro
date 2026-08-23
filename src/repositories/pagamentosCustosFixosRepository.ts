import { sheetsService } from '@/services/sheetsService'
import type { PagamentoCustoFixo } from '@/types/finance'

const RECURSO = 'pagamentos-custos-fixos'

export type NovoPagamentoCustoFixo = Omit<PagamentoCustoFixo, 'id'>

export const pagamentosCustosFixosRepository = {
  listar: () => sheetsService.listar<PagamentoCustoFixo[]>(RECURSO),

  criar: (pagamento: NovoPagamentoCustoFixo) =>
    sheetsService.criar<PagamentoCustoFixo>(RECURSO, pagamento),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
