import { useCallback, useEffect, useState } from 'react'
import { contasRepository, type NovaConta } from '@/repositories/contasRepository'
import type { Conta } from '@/types/finance'

export function useContas() {
  const [contas, setContas] = useState<Conta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await contasRepository.listar()
      setContas(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar contas')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const criar = useCallback(async (dados: NovaConta) => {
    const criada = await contasRepository.criar(dados)
    setContas((atual) => [...atual, criada])
  }, [])

  const atualizar = useCallback(async (id: string, dados: NovaConta) => {
    const atualizada = await contasRepository.atualizar(id, dados)
    setContas((atual) => atual.map((c) => (c.id === id ? atualizada : c)))
  }, [])

  const excluir = useCallback(async (id: string) => {
    await contasRepository.excluir(id)
    setContas((atual) => atual.filter((c) => c.id !== id))
  }, [])

  return { contas, carregando, erro, recarregar: carregar, criar, atualizar, excluir }
}
