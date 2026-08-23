import { sheetsService } from '@/services/sheetsService'
import type { Divida } from '@/types/finance'

const RECURSO = 'dividas'

export type NovaDivida = Omit<Divida, 'id'>

export const dividasRepository = {
  listar: () => sheetsService.listar<Divida[]>(RECURSO),

  criar: (divida: NovaDivida) => sheetsService.criar<Divida>(RECURSO, divida),

  atualizar: (id: string, divida: NovaDivida) => sheetsService.atualizar<Divida>(RECURSO, id, divida),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
