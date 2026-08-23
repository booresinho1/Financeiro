import { sheetsService } from '@/services/sheetsService'
import type { Meta } from '@/types/finance'

const RECURSO = 'metas'

export type NovaMeta = Omit<Meta, 'id'>

export const metasRepository = {
  listar: () => sheetsService.listar<Meta[]>(RECURSO),

  criar: (meta: NovaMeta) => sheetsService.criar<Meta>(RECURSO, meta),

  atualizar: (id: string, meta: NovaMeta) => sheetsService.atualizar<Meta>(RECURSO, id, meta),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
