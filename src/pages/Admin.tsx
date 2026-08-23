import { ShieldCheck, Ban, CheckCircle2, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAdminUsuarios } from '@/hooks/useAdminUsuarios'
import { formatDate } from '@/lib/format'
import type { UsuarioAdmin } from '@/repositories/adminRepository'

const ROTULOS_USO: Record<string, string> = {
  despesas: 'Despesas',
  entradas: 'Entradas',
  contas: 'Contas',
  dividas: 'Dívidas',
  custos_fixos: 'Custos fixos',
}

export function Admin() {
  const { usuarios, carregando, erro, desativar, reativar, excluir } = useAdminUsuarios()

  async function handleDesativar(u: UsuarioAdmin) {
    if (!confirm(`Desativar o acesso de "${u.email}"?`)) return
    await desativar(u.id)
  }

  async function handleReativar(u: UsuarioAdmin) {
    await reativar(u.id)
  }

  async function handleExcluir(u: UsuarioAdmin) {
    if (
      !confirm(
        `Excluir permanentemente a conta "${u.email}" e todos os dados dela? Essa ação não pode ser desfeita.`
      )
    )
      return
    await excluir(u.id)
  }

  return (
    <>
      <PageHeader
        title="Administração"
        subtitle="Contas cadastradas no app — acesso restrito à conta master"
      />

      {erro && (
        <div className="mb-4 rounded-xl border border-expense/25 bg-expense-soft px-4 py-3 text-sm text-expense">
          {erro}
        </div>
      )}

      {carregando ? (
        <div className="rounded-2xl border border-line bg-surface py-16 text-center text-sm text-ink-muted shadow-sm shadow-slate-900/[0.02]">
          Carregando...
        </div>
      ) : usuarios.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nenhum usuário encontrado" description="" />
      ) : (
        <div className="space-y-3">
          {usuarios.map((u) => (
            <div key={u.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm shadow-slate-900/[0.02]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{u.email}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Criada em {formatDate(u.criadoEm)} ·{' '}
                    {u.confirmado ? 'e-mail confirmado' : 'e-mail pendente'}
                  </p>
                  <span
                    className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      u.desativado ? 'bg-expense-soft text-expense' : 'bg-brand-soft text-brand'
                    }`}
                  >
                    {u.desativado ? 'Desativada' : 'Ativa'}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {u.desativado ? (
                    <button
                      aria-label="Reativar"
                      onClick={() => handleReativar(u)}
                      className="p-1.5 text-ink-muted hover:text-brand"
                      title="Reativar"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      aria-label="Desativar"
                      onClick={() => handleDesativar(u)}
                      className="p-1.5 text-ink-muted hover:text-amber-600"
                      title="Desativar"
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    aria-label="Excluir"
                    onClick={() => handleExcluir(u)}
                    className="p-1.5 text-ink-muted hover:text-expense"
                    title="Excluir conta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-line-soft">
                {Object.entries(u.uso).map(([tabela, qtd]) => (
                  <div key={tabela}>
                    <p className="text-xs text-ink-muted">{ROTULOS_USO[tabela] ?? tabela}</p>
                    <p className="text-sm font-semibold text-ink">{qtd}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
