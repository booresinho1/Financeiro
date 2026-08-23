import { useCallback, useEffect, useState } from 'react'
import { parcelasRepository, type NovaParcela } from '@/repositories/parcelasRepository'
import type { Parcela } from '@/types/finance'

export function useParcelas() {
  const [parcelas, setParcelas] = useState<Parcela[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await parcelasRepository.listar()
      setParcelas(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar parcelas')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const atualizar = useCallback(async (id: string, dados: NovaParcela) => {
    const atualizada = await parcelasRepository.atualizar(id, dados)
    setParcelas((atual) => atual.map((p) => (p.id === id ? atualizada : p)))
  }, [])

  const excluir = useCallback(async (id: string) => {
    await parcelasRepository.excluir(id)
    setParcelas((atual) => atual.filter((p) => p.id !== id))
  }, [])

  return { parcelas, carregando, erro, recarregar: carregar, atualizar, excluir }
}
