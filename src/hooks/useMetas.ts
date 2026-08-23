import { useCallback, useEffect, useState } from 'react'
import { metasRepository } from '@/repositories/metasRepository'
import type { Meta } from '@/types/finance'

export function useMetas() {
  const [metas, setMetas] = useState<Meta[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await metasRepository.listar()
      setMetas(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar metas')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const salvar = useCallback(async (idConta: string, valorMeta: number, metaExistente?: Meta) => {
    if (metaExistente) {
      const atualizada = await metasRepository.atualizar(metaExistente.id, { idConta, valorMeta })
      setMetas((atual) => atual.map((m) => (m.id === metaExistente.id ? atualizada : m)))
    } else {
      const criada = await metasRepository.criar({ idConta, valorMeta })
      setMetas((atual) => [...atual, criada])
    }
  }, [])

  const excluir = useCallback(async (id: string) => {
    await metasRepository.excluir(id)
    setMetas((atual) => atual.filter((m) => m.id !== id))
  }, [])

  return { metas, carregando, erro, recarregar: carregar, salvar, excluir }
}
