import { sheetsService } from '@/services/sheetsService'
import type { Movimentacao } from '@/types/finance'

const RECURSO = 'movimentacoes'

export type NovaMovimentacao = Omit<Movimentacao, 'id'>

export const movimentacoesRepository = {
  listar: () => sheetsService.listar<Movimentacao[]>(RECURSO),

  criar: (movimentacao: NovaMovimentacao) =>
    sheetsService.criar<Movimentacao>(RECURSO, movimentacao),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
