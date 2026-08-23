import { useCallback, useEffect, useState } from 'react'
import {
  subcategoriasRepository,
  type NovaSubcategoria,
} from '@/repositories/subcategoriasRepository'
import type { Subcategoria } from '@/types/finance'

export function useSubcategorias() {
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await subcategoriasRepository.listar()
      setSubcategorias(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar subcategorias')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const criar = useCallback(async (dados: NovaSubcategoria) => {
    const criada = await subcategoriasRepository.criar(dados)
    setSubcategorias((atual) => [...atual, criada])
    return criada
  }, [])

  const atualizar = useCallback(async (id: string, dados: NovaSubcategoria) => {
    const atualizada = await subcategoriasRepository.atualizar(id, dados)
    setSubcategorias((atual) => atual.map((s) => (s.id === id ? atualizada : s)))
  }, [])

  return { subcategorias, carregando, erro, recarregar: carregar, criar, atualizar }
}
