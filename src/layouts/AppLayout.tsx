import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { DespesaFormModal } from '@/components/despesas/DespesaFormModal'
import { useDespesas } from '@/hooks/useDespesas'

export function AppLayout() {
  const [modalNovaDespesaAberto, setModalNovaDespesaAberto] = useState(false)
  const { criar } = useDespesas()

  return (
    <div className="flex h-screen bg-app">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0">
        <Topbar onNovaDespesa={() => setModalNovaDespesaAberto(true)} />

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav onNovaDespesa={() => setModalNovaDespesaAberto(true)} />

      {modalNovaDespesaAberto && (
        <DespesaFormModal
          onClose={() => setModalNovaDespesaAberto(false)}
          onSubmit={async (dados) => {
            await criar(dados)
          }}
        />
      )}
    </div>
  )
}
