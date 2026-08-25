import { useCallback, useEffect, useState } from 'react'
import { dividasRepository, type NovaDivida } from '@/repositories/dividasRepository'
import type { Divida } from '@/types/finance'

export function useDividas() {
  const [dividas, setDividas] = useState<Divida[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await dividasRepository.listar()
      setDividas(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar dívidas')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const excluir = useCallback(async (id: string) => {
    await dividasRepository.excluir(id)
    setDividas((atual) => atual.filter((d) => d.id !== id))
  }, [])

  const atualizar = useCallback(async (id: string, dados: NovaDivida) => {
    const atualizada = await dividasRepository.atualizar(id, dados)
    setDividas((atual) => atual.map((d) => (d.id === id ? atualizada : d)))
  }, [])

  return { dividas, carregando, erro, recarregar: carregar, excluir, atualizar }
}
