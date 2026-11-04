import { useCallback, useEffect, useState } from 'react'
import { despesasRepository, type NovaDespesa } from '@/repositories/despesasRepository'
import type { Despesa } from '@/types/finance'

// cada tela tem o seu useDespesas: sem este aviso, o que o botão do topo cria não aparece na lista aberta
const canal = new EventTarget()
const ALTERADAS = 'despesas-alteradas'

export function useDespesas() {
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [instancia] = useState(() => ({}))

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

  useEffect(() => {
    function aoAlterar(e: Event) {
      if ((e as CustomEvent).detail === instancia) return
      // sem mexer em "carregando": a tela atualiza sem piscar
      despesasRepository.listar().then(setDespesas).catch(() => {})
    }
    canal.addEventListener(ALTERADAS, aoAlterar)
    return () => canal.removeEventListener(ALTERADAS, aoAlterar)
  }, [instancia])

  const avisar = useCallback(() => {
    canal.dispatchEvent(new CustomEvent(ALTERADAS, { detail: instancia }))
  }, [instancia])

  const criar = useCallback(
    async (dados: NovaDespesa) => {
      const criada = await despesasRepository.criar(dados)
      setDespesas((atual) => [criada, ...atual])
      avisar()
      return criada
    },
    [avisar]
  )

  const atualizar = useCallback(
    async (id: string, dados: NovaDespesa) => {
      const atualizada = await despesasRepository.atualizar(id, dados)
      setDespesas((atual) => atual.map((d) => (d.id === id ? atualizada : d)))
      avisar()
    },
    [avisar]
  )

  const excluir = useCallback(
    async (id: string) => {
      await despesasRepository.excluir(id)
      setDespesas((atual) => atual.filter((d) => d.id !== id))
      avisar()
    },
    [avisar]
  )

  return { despesas, carregando, erro, recarregar: carregar, criar, atualizar, excluir }
}
