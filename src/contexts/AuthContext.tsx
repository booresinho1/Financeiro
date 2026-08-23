import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface AuthContextValue {
  user: User | null
  session: Session | null
  carregando: boolean
  recuperacaoSenha: boolean
  entrar: (email: string, senha: string) => Promise<void>
  cadastrar: (email: string, senha: string) => Promise<void>
  enviarEmailRecuperacao: (email: string) => Promise<void>
  atualizarSenha: (novaSenha: string) => Promise<void>
  cancelarRecuperacao: () => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [recuperacaoSenha, setRecuperacaoSenha] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, novaSession) => {
      setSession(novaSession)
      if (event === 'PASSWORD_RECOVERY') {
        setRecuperacaoSenha(true)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
  }

  async function cadastrar(email: string, senha: string) {
    const { error } = await supabase.auth.signUp({ email, password: senha })
    if (error) throw error
  }

  async function enviarEmailRecuperacao(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  async function atualizarSenha(novaSenha: string) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) throw error
    setRecuperacaoSenha(false)
  }

  async function cancelarRecuperacao() {
    setRecuperacaoSenha(false)
    await supabase.auth.signOut()
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        carregando,
        recuperacaoSenha,
        entrar,
        cadastrar,
        enviarEmailRecuperacao,
        atualizarSenha,
        cancelarRecuperacao,
        sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
