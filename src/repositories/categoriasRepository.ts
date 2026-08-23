import { sheetsService } from '@/services/sheetsService'
import type { Categoria } from '@/types/finance'

const RECURSO = 'categorias'

export type NovaCategoria = Omit<Categoria, 'id'>

export const categoriasRepository = {
  listar: () => sheetsService.listar<Categoria[]>(RECURSO),

  criar: (categoria: NovaCategoria) => sheetsService.criar<Categoria>(RECURSO, categoria),

  atualizar: (id: string, categoria: NovaCategoria) =>
    sheetsService.atualizar<Categoria>(RECURSO, id, categoria),
}
