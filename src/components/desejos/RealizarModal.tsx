import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { reservadoDe, type Desejo } from '@/lib/desejos'
import { formatCurrency } from '@/lib/format'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm'

export function RealizarModal({
  desejo,
  guardado,
  hoje,
  onClose,
  onConfirmar,
}: {
  desejo: Desejo
  guardado: number
  hoje: string
  onClose: () => void
  onConfirmar: (dados: { valorPago: number; realizadoEm: string; descontar: boolean }) => void
}) {
  const [valor, setValor] = useState(String(desejo.valor).replace('.', ','))
  const [data, setData] = useState(hoje)
  const [descontar, setDescontar] = useState(guardado > 0)
  const valorNum = Number(valor.replace(',', '.'))
  const valido = valor.trim() !== '' && Number.isFinite(valorNum) && valorNum >= 0
  const diferenca = valido ? desejo.valor - valorNum : 0
  const reservado = reservadoDe(desejo)
  const doSeparado = valido ? Math.max(valorNum - reservado, 0) : 0

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!valido || !data) return
    onConfirmar({ valorPago: valorNum, realizadoEm: data, descontar })
    onClose()
  }

  return (
    <Modal title={`Realizei: ${desejo.nome}`} subtitle="Sai da fila e vai para as conquistas" onClose={onClose}>
      <form onSubmit={enviar} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">Quanto custou de verdade?</label>
            <input autoFocus inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">Quando?</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={CAMPO} />
          </div>
        </div>
        {valido && Math.abs(diferenca) >= 0.01 && (
          <p className={`text-sm font-semibold ${diferenca > 0 ? 'text-income' : 'text-warning'}`}>
            {diferenca > 0 ? `${formatCurrency(diferenca)} abaixo do previsto` : `${formatCurrency(-diferenca)} acima do previsto`}
          </p>
        )}
        {reservado > 0 && (
          <p className="rounded-xl bg-surface-2/50 p-3 text-xs text-ink-muted">
            Os <b className="text-ink-soft">{formatCurrency(reservado)}</b> que você guardou para ele pagam primeiro.
          </p>
        )}
        {guardado > 0 && doSeparado > 0 && (
          <label className="flex items-start gap-2 rounded-xl bg-surface-2/50 p-3 text-sm text-ink-soft">
            <input type="checkbox" checked={descontar} onChange={(e) => setDescontar(e.target.checked)} className="mt-0.5 accent-[var(--color-brand)]" />
            <span>
              {reservado > 0 ? `O resto (${formatCurrency(doSeparado)}) saiu do dinheiro separado` : 'Paguei com o dinheiro separado'}
              <span className="block text-xs text-ink-muted">
                o separado cai de {formatCurrency(guardado)} para {formatCurrency(Math.max(guardado - doSeparado, 0))}
              </span>
            </span>
          </label>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface-2">
            Cancelar
          </button>
          <button type="submit" disabled={!valido || !data} className="flex-1 rounded-xl bg-income px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            Realizei 🎉
          </button>
        </div>
      </form>
    </Modal>
  )
}
