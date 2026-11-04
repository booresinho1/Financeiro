import { useCallback, useEffect, useState } from 'react'
import { pluggyRepository } from '@/repositories/pluggyRepository'
import type { CartaoResumo } from '@/types/finance'

/** Com `ativo` falso não chama o servidor: dados de banco são só do dono da conta. */
export function useCartoes(ativo = true) {
  const [cartoes, setCartoes] = useState<CartaoResumo[]>([])
  const [carregando, setCarregando] = useState(ativo)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setCartoes(await pluggyRepository.listarCartoes())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os cartões')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (ativo) carregar()
  }, [ativo, carregar])

  return { cartoes, carregando, erro, recarregar: carregar }
}
