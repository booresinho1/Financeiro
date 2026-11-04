import { useCallback, useEffect, useState } from 'react'
import { pluggyRepository } from '@/repositories/pluggyRepository'
import type { BancoConectado } from '@/types/finance'

/** Com `ativo` falso não chama o servidor: dados de banco são só do dono da conta. */
export function useSaldosBancos(ativo = true) {
  const [bancos, setBancos] = useState<BancoConectado[]>([])
  const [carregando, setCarregando] = useState(ativo)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setBancos(await pluggyRepository.listarSaldos())
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar saldos dos bancos')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (ativo) carregar()
  }, [ativo, carregar])

  return { bancos, carregando, erro, recarregar: carregar }
}
