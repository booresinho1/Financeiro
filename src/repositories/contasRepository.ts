import { sheetsService } from '@/services/sheetsService'
import type { Conta } from '@/types/finance'

const RECURSO = 'contas'

export type NovaConta = Omit<Conta, 'id'>

export const contasRepository = {
  listar: () => sheetsService.listar<Conta[]>(RECURSO),

  criar: (conta: NovaConta) => sheetsService.criar<Conta>(RECURSO, conta),

  atualizar: (id: string, conta: NovaConta) => sheetsService.atualizar<Conta>(RECURSO, id, conta),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
