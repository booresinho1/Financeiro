import { useCallback, useEffect, useState } from 'react'
import { categoriasRepository, type NovaCategoria } from '@/repositories/categoriasRepository'
import type { Categoria } from '@/types/finance'

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await categoriasRepository.listar()
      setCategorias(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar categorias')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const criar = useCallback(async (dados: NovaCategoria) => {
    const criada = await categoriasRepository.criar(dados)
    setCategorias((atual) => [...atual, criada])
    return criada
  }, [])

  const atualizar = useCallback(async (id: string, dados: NovaCategoria) => {
    const atualizada = await categoriasRepository.atualizar(id, dados)
    setCategorias((atual) => atual.map((c) => (c.id === id ? atualizada : c)))
  }, [])

  return { categorias, carregando, erro, recarregar: carregar, criar, atualizar }
}
