import { useCallback, useEffect, useState } from 'react'
import { adminRepository } from '@/repositories/adminRepository'
import type { UsuarioAdmin } from '@/repositories/adminRepository'

export function useAdminUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const dados = await adminRepository.listar()
      setUsuarios(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar usuários')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  const desativar = useCallback(async (id: string) => {
    await adminRepository.desativar(id)
    setUsuarios((atual) => atual.map((u) => (u.id === id ? { ...u, desativado: true } : u)))
  }, [])

  const reativar = useCallback(async (id: string) => {
    await adminRepository.reativar(id)
    setUsuarios((atual) => atual.map((u) => (u.id === id ? { ...u, desativado: false } : u)))
  }, [])

  const excluir = useCallback(async (id: string) => {
    await adminRepository.excluir(id)
    setUsuarios((atual) => atual.filter((u) => u.id !== id))
  }, [])

  return { usuarios, carregando, erro, recarregar: carregar, desativar, reativar, excluir }
}
