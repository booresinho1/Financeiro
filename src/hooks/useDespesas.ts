import { useCallback, useEffect, useState } from 'react'
import { despesasRepository, type NovaDespesa } from '@/repositories/despesasRepository'
import type { Despesa } from '@/types/finance'

export function useDespesas() {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await despesasRepository.listar()
      setDespesas(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar despesas')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const criar = useCallback(async (dados: NovaDespesa) => {
    const criada = await despesasRepository.criar(dados)
    setDespesas((atual) => [criada, ...atual])
  }, [])

  const atualizar = useCallback(async (id: string, dados: NovaDespesa) => {
    const atualizada = await despesasRepository.atualizar(id, dados)
    setDespesas((atual) => atual.map((d) => (d.id === id ? atualizada : d)))
  }, [])

  const excluir = useCallback(async (id: string) => {
    await despesasRepository.excluir(id)
    setDespesas((atual) => atual.filter((d) => d.id !== id))
  }, [])

  return { despesas, carregando, erro, recarregar: carregar, criar, atualizar, excluir }
}
