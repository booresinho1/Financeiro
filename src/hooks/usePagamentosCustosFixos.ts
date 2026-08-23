import { useCallback, useEffect, useState } from 'react'
import {
  pagamentosCustosFixosRepository,
  type NovoPagamentoCustoFixo,
} from '@/repositories/pagamentosCustosFixosRepository'
import type { PagamentoCustoFixo } from '@/types/finance'

export function usePagamentosCustosFixos() {
  const [pagamentos, setPagamentos] = useState<PagamentoCustoFixo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await pagamentosCustosFixosRepository.listar()
      setPagamentos(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar pagamentos')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const registrar = useCallback(async (dados: NovoPagamentoCustoFixo) => {
    const criado = await pagamentosCustosFixosRepository.criar(dados)
    setPagamentos((atual) => [...atual, criado])
  }, [])

  const desmarcar = useCallback(async (id: string) => {
    await pagamentosCustosFixosRepository.excluir(id)
    setPagamentos((atual) => atual.filter((p) => p.id !== id))
  }, [])

  return { pagamentos, carregando, erro, recarregar: carregar, registrar, desmarcar }
}
