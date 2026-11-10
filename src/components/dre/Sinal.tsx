import type { SinalCategoria } from '@/lib/acao'
import { ESTILO_NIVEL, legendaDoSinal, numeroDoSinal } from '@/components/dre/sinalEstilo'

/** Na versão compacta mostra o estado ("Agir"); a porcentagem fica na legenda ao lado. */
export function PilulaSinal({ sinal, compacta = false }: { sinal: SinalCategoria; compacta?: boolean }) {
  const e = ESTILO_NIVEL[sinal.nivel]
  return (
    <span
      title={legendaDoSinal(sinal)}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-bold ${e.fundo} ${e.texto} ${
        compacta ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      <e.Icone className={compacta ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.4} />
      {compacta ? e.rotulo : numeroDoSinal(sinal)}
    </span>
  )
}

/** Barra de uso com um traço no 100% (orçamento ou média); passar do traço fica visível. */
export function BarraUso({ sinal, alta = false }: { sinal: SinalCategoria; alta?: boolean }) {
  const escala = Math.max(sinal.uso, 100) * 1.04
  const e = ESTILO_NIVEL[sinal.nivel]
  return (
    <div className={`relative w-full rounded-full bg-ink/10 dark:bg-white/10 ${alta ? 'h-2.5' : 'h-1.5'}`}>
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${e.barra}`}
        style={{ width: `${(sinal.uso / escala) * 100}%`, transition: 'width 500ms ease-out' }}
      />
      <div
        aria-hidden
        className="absolute -inset-y-1 w-0.5 rounded-full bg-ink/70 dark:bg-white/80"
        style={{ left: `calc(${(100 / escala) * 100}% - 1px)` }}
      />
    </div>
  )
}
