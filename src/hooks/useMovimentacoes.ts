import { useCallback, useEffect, useState } from 'react'
import {
  movimentacoesRepository,
  type NovaMovimentacao,
} from '@/repositories/movimentacoesRepository'
import type { Movimentacao } from '@/types/finance'

export function useMovimentacoes() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await movimentacoesRepository.listar()
      setMovimentacoes(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar movimentações')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const criar = useCallback(async (dados: NovaMovimentacao) => {
    const criada = await movimentacoesRepository.criar(dados)
    setMovimentacoes((atual) => [criada, ...atual])
  }, [])

  const excluir = useCallback(async (id: string) => {
    await movimentacoesRepository.excluir(id)
    setMovimentacoes((atual) => atual.filter((m) => m.id !== id))
  }, [])

  return { movimentacoes, carregando, erro, recarregar: carregar, criar, excluir }
}
