import { useCallback, useEffect, useState } from 'react'
import { orcamentosRepository, type NovoOrcamento } from '@/repositories/orcamentosRepository'
import type { Orcamento } from '@/types/finance'

export function useOrcamentos() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await orcamentosRepository.listar()
      setOrcamentos(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar orçamentos')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const criar = useCallback(async (dados: NovoOrcamento) => {
    const criado = await orcamentosRepository.criar(dados)
    setOrcamentos((atual) => [...atual, criado])
  }, [])

  const atualizar = useCallback(async (id: string, dados: NovoOrcamento) => {
    const atualizado = await orcamentosRepository.atualizar(id, dados)
    setOrcamentos((atual) => atual.map((o) => (o.id === id ? atualizado : o)))
  }, [])

  const excluir = useCallback(async (id: string) => {
    await orcamentosRepository.excluir(id)
    setOrcamentos((atual) => atual.filter((o) => o.id !== id))
  }, [])

  return { orcamentos, carregando, erro, recarregar: carregar, criar, atualizar, excluir }
}
