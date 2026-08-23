import { sheetsService } from '@/services/sheetsService'
import type { Entrada } from '@/types/finance'

const RECURSO = 'entradas'

export type NovaEntrada = Omit<Entrada, 'id'>

export const entradasRepository = {
  listar: () => sheetsService.listar<Entrada[]>(RECURSO),

  criar: (entrada: NovaEntrada) => sheetsService.criar<Entrada>(RECURSO, entrada),

  atualizar: (id: string, entrada: NovaEntrada) =>
    sheetsService.atualizar<Entrada>(RECURSO, id, entrada),

  excluir: (id: string) => sheetsService.excluir(RECURSO, id),
}
