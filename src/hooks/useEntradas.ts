import { useCallback, useEffect, useState } from 'react'
import { entradasRepository, type NovaEntrada } from '@/repositories/entradasRepository'
import type { Entrada } from '@/types/finance'

export function useEntradas() {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await entradasRepository.listar()
      setEntradas(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar entradas')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const criar = useCallback(async (dados: NovaEntrada) => {
    const criada = await entradasRepository.criar(dados)
    setEntradas((atual) => [criada, ...atual])
  }, [])

  const atualizar = useCallback(async (id: string, dados: NovaEntrada) => {
    const atualizada = await entradasRepository.atualizar(id, dados)
    setEntradas((atual) => atual.map((e) => (e.id === id ? atualizada : e)))
  }, [])

  const excluir = useCallback(async (id: string) => {
    await entradasRepository.excluir(id)
    setEntradas((atual) => atual.filter((e) => e.id !== id))
  }, [])

  return { entradas, carregando, erro, recarregar: carregar, criar, atualizar, excluir }
}
