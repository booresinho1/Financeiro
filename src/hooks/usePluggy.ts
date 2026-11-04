import { useCallback, useEffect, useState } from 'react'
import { pluggyRepository } from '@/repositories/pluggyRepository'
import { separarIds } from '@/lib/divisao'
import type {
  ContaPluggy,
  PluggyItem,
  StatusTransacaoPendente,
  TransacaoPendente,
} from '@/types/finance'

export function usePluggy() {
  const [itens, setItens] = useState<PluggyItem[]>([])
  const [pendentes, setPendentes] = useState<TransacaoPendente[]>([])
  const [vinculados, setVinculados] = useState<Set<string>>(new Set())
  const [contasPluggy, setContasPluggy] = useState<ContaPluggy[]>([])
  const [carregando, setCarregando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [i, p] = await Promise.all([
        pluggyRepository.listarItens(),
        pluggyRepository.listarPendentes(),
      ])
      setItens(i)
      setPendentes(
        p.filter((t) => t.status === 'PENDENTE').sort((a, b) => b.data.localeCompare(a.data))
      )
      setVinculados(new Set(p.flatMap((t) => separarIds(t.idLancamento))))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar dados do Pluggy')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const sincronizar = useCallback(
    async (opcoes: { desde: string; tipos: string[] }) => {
      setSincronizando(true)
      setErro(null)
      try {
        const r = await pluggyRepository.sincronizar(opcoes)
        setContasPluggy(r.contas)
        await carregar()
        return r.novas
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao sincronizar')
        return null
      } finally {
        setSincronizando(false)
      }
    },
    [carregar]
  )

  // salvar a conexão não busca transações: quem decide o período é a sincronização
  const conectar = useCallback(async (itemId: string) => {
    const item = await pluggyRepository.salvarItem(itemId)
    setItens((atual) => [item, ...atual.filter((i) => i.itemId !== item.itemId)])
  }, [])

  const desconectar = useCallback(async (item: PluggyItem) => {
    await pluggyRepository.excluirItem(item.id)
    setItens((atual) => atual.filter((i) => i.id !== item.id))
    setPendentes((atual) => atual.filter((t) => t.itemId !== item.itemId))
  }, [])

  const marcar = useCallback(
    async (t: TransacaoPendente, status: StatusTransacaoPendente, idLancamento?: string) => {
      await pluggyRepository.atualizarPendente({ ...t, status, idLancamento })
      setPendentes((atual) => atual.filter((x) => x.id !== t.id))
      if (idLancamento) {
        setVinculados((atual) => new Set([...atual, ...separarIds(idLancamento)]))
      }
    },
    []
  )

  return {
    itens,
    pendentes,
    vinculados,
    contasPluggy,
    carregando,
    sincronizando,
    erro,
    sincronizar,
    conectar,
    desconectar,
    marcar,
  }
}
