export type StatusOrcamento = 'verde' | 'amarelo' | 'vermelho'

export function calcularStatus(percentual: number): StatusOrcamento {
  if (percentual >= 100) return 'vermelho'
  if (percentual >= 80) return 'amarelo'
  return 'verde'
}

export const CORES_STATUS: Record<StatusOrcamento, { barra: string; texto: string; fundo: string }> = {
  verde: { barra: 'bg-emerald-500', texto: 'text-emerald-700', fundo: 'bg-emerald-50' },
  amarelo: { barra: 'bg-amber-500', texto: 'text-amber-700', fundo: 'bg-amber-50' },
  vermelho: { barra: 'bg-red-500', texto: 'text-red-700', fundo: 'bg-red-50' },
}
