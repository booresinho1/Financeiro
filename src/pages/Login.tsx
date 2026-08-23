import { useState, type FormEvent } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import logo from '@/assets/logo.png'

export function Login() {
  const { entrar, cadastrar, enviarEmailRecuperacao } = useAuth()
  const [modo, setModo] = useState<'entrar' | 'cadastrar' | 'recuperar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  function trocarModo(novoModo: 'entrar' | 'cadastrar') {
    setModo(novoModo)
    setSenha('')
    setConfirmarSenha('')
    setErro(null)
    setMensagem(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setMensagem(null)

    if (modo === 'recuperar') {
      setCarregando(true)
      try {
        await enviarEmailRecuperacao(email)
        setMensagem('Enviamos um e-mail com o link para redefinir sua senha.')
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao enviar e-mail')
      } finally {
        setCarregando(false)
      }
      return
    }

    if (modo === 'cadastrar' && senha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setCarregando(true)
    try {
      if (modo === 'entrar') {
        await entrar(email, senha)
      } else {
        await cadastrar(email, senha)
        setMensagem('Conta criada! Verifique seu e-mail para confirmar antes de entrar.')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao autenticar')
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
          {modo !== 'recuperar' ? (
            <div className="flex mb-6 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => trocarModo('entrar')}
                className={`flex-1 rounded-lg py-1.5 transition-colors ${
                  modo === 'entrar' ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => trocarModo('cadastrar')}
                className={`flex-1 rounded-lg py-1.5 transition-colors ${
                  modo === 'cadastrar' ? 'bg-surface shadow-sm text-ink' : 'text-ink-muted'
                }`}
              >
                Criar conta
              </button>
            </div>
          ) : (
            <div className="mb-5">
              <h1 className="text-base font-semibold text-ink mb-1">Recuperar senha</h1>
              <p className="text-sm text-ink-muted">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-ink-soft mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
                required
                autoFocus
              />
            </div>

            {modo !== 'recuperar' && (
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm"
                  minLength={6}
                  required
                />
              </div>
            )}

            {modo === 'cadastrar' && (
              <div>
                <label className="block text-sm font-medium text-ink-soft mb-1">
                  Confirmar senha
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
            )}

            {modo === 'entrar' && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setModo('recuperar')
                    setSenha('')
                    setErro(null)
                    setMensagem(null)
                  }}
                  className="text-xs font-medium text-brand hover:text-brand-hover"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {erro && <p className="text-sm text-expense">{erro}</p>}
            {mensagem && <p className="text-sm text-brand">{mensagem}</p>}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10 disabled:opacity-60"
            >
              {carregando
                ? 'Aguarde...'
                : modo === 'entrar'
                  ? 'Entrar'
                  : modo === 'cadastrar'
                    ? 'Criar conta'
                    : 'Enviar link de recuperação'}
            </button>

            {modo === 'recuperar' && (
              <button
                type="button"
                onClick={() => trocarModo('entrar')}
                className="w-full text-center text-xs font-medium text-ink-muted hover:text-ink-soft pt-1"
              >
                Voltar pro login
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
