import { sheetsService } from '@/services/sheetsService'
import type { Subcategoria } from '@/types/finance'

const RECURSO = 'subcategorias'

export type NovaSubcategoria = Omit<Subcategoria, 'id'>

export const subcategoriasRepository = {
  listar: () => sheetsService.listar<Subcategoria[]>(RECURSO),

  criar: (subcategoria: NovaSubcategoria) =>
    sheetsService.criar<Subcategoria>(RECURSO, subcategoria),

  atualizar: (id: string, subcategoria: NovaSubcategoria) =>
    sheetsService.atualizar<Subcategoria>(RECURSO, id, subcategoria),
}
