import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { EMAIL_MASTER } from '@/lib/navigation'
import { AppLayout } from '@/layouts/AppLayout'
import { Login } from '@/pages/Login'
import { RedefinirSenha } from '@/pages/RedefinirSenha'
import { Dashboard } from '@/pages/Dashboard'
import { Despesas } from '@/pages/Despesas'
import { Entradas } from '@/pages/Entradas'
import { Contas } from '@/pages/Contas'
import { CustosFixos } from '@/pages/CustosFixos'
import { Dividas } from '@/pages/Dividas'
import { Orcamentos } from '@/pages/Orcamentos'
import { Configuracoes } from '@/pages/Configuracoes'
import { Admin } from '@/pages/Admin'

function App() {
  const { user, carregando, recuperacaoSenha } = useAuth()

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-ink-faint">
        Carregando...
      </div>
    )
  }

  if (recuperacaoSenha) {
    return <RedefinirSenha />
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="despesas" element={<Despesas />} />
        <Route path="entradas" element={<Entradas />} />
        <Route path="contas" element={<Contas />} />
        <Route path="custos-fixos" element={<CustosFixos />} />
        <Route path="dividas" element={<Dividas />} />
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        {user.email === EMAIL_MASTER && <Route path="admin" element={<Admin />} />}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
