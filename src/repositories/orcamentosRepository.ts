import { sheetsService } from '@/services/sheetsService'
import type { Orcamento } from '@/types/finance'

const RECURSO = 'orcamentos'

export type NovoOrcamento = Omit<Orcamento, 'id'>

export const orcamentosRepository = {
  listar: () => sheetsService.listar<Orcamento[]>(RECURSO),

  criar: (orcamento: NovoOrcamento) => sheetsService.criar<Orcamento>(RECURSO, orcamento),

  atualizar: (id: string, orcamento: NovoOrcamento) =>
    sheetsService.atualizar<Orcamento>(RECURSO, id, orcamento),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
