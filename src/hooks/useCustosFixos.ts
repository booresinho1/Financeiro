import { useCallback, useEffect, useState } from 'react'
import { custosFixosRepository, type NovoCustoFixo } from '@/repositories/custosFixosRepository'
import type { CustoFixo } from '@/types/finance'

export function useCustosFixos() {
  const [custosFixos, setCustosFixos] = useState<CustoFixo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await custosFixosRepository.listar()
      setCustosFixos(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar custos fixos')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const criar = useCallback(async (dados: NovoCustoFixo) => {
    const criado = await custosFixosRepository.criar(dados)
    setCustosFixos((atual) => [...atual, criado])
  }, [])

  const atualizar = useCallback(async (id: string, dados: NovoCustoFixo) => {
    const atualizado = await custosFixosRepository.atualizar(id, dados)
    setCustosFixos((atual) => atual.map((c) => (c.id === id ? atualizado : c)))
  }, [])

  const excluir = useCallback(async (id: string) => {
    await custosFixosRepository.excluir(id)
    setCustosFixos((atual) => atual.filter((c) => c.id !== id))
  }, [])

  return { custosFixos, carregando, erro, recarregar: carregar, criar, atualizar, excluir }
}
