import { useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/logo.png'

export function RedefinirSenha() {
  const { atualizarSenha, cancelarRecuperacao } = useAuth()
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setCarregando(true)
    try {
      await atualizarSenha(senha)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao redefinir senha')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <img src={logo} alt="Financeiro" className="h-10 w-10 rounded-xl shadow-sm shadow-black/20" />
          <span className="text-xl font-bold tracking-tight text-ink">Financeiro</span>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-slate-900/[0.03]">
          <h1 className="text-base font-semibold text-ink mb-1">Definir nova senha</h1>
          <p className="text-sm text-ink-muted mb-5">
            Escolha uma nova senha para sua conta.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1">Nova senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
                minLength={6}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1">
                Confirmar nova senha
              </label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
                minLength={6}
                required
              />
            </div>

            {erro && <p className="text-sm text-expense">{erro}</p>}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10 disabled:opacity-60"
            >
              {carregando ? 'Salvando...' : 'Salvar nova senha'}
            </button>

            <button
              type="button"
              onClick={cancelarRecuperacao}
              className="w-full text-center text-xs font-medium text-ink-muted hover:text-ink-soft pt-1"
            >
              Cancelar e voltar pro login
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
