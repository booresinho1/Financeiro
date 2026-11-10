import { SeletorMes } from '@/components/shared/SeletorMes'
import { formatCurrency } from '@/lib/format'
import { nomeDoMes, rotuloMes } from '@/lib/dre'
import type { DreMes } from '@/hooks/useDreMes'

const pctTexto = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

/** Resultado do mês em destaque e, embaixo, Entrou e Saiu na mesma escala (o que passa da receita fica em vermelho). */
export function CabecalhoDre({
  mes,
  onMes,
  d,
}: {
  mes: string
  onMes: (mes: string) => void
  d: DreMes
}) {
  const { dre, meses, atual, entrou, saiu, resultado, comDados, mesHoje } = d
  const antes = atual > 0 ? dre.resultado[atual - 1] : null
  const nomeAntes = atual > 0 ? nomeDoMes(meses[atual - 1]).toLowerCase() : ''
  // Entrou e Saiu na mesma escala
  const escala = Math.max(entrou, saiu, 1)
  const posReceita = (entrou / escala) * 100
  const posSaiu = (saiu / escala) * 100
  const vazio = entrou <= 0 && saiu <= 0

  return (
    <header className="relative z-20 rounded-3xl border border-line bg-surface p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink-muted">
          Resultado de {nomeDoMes(mes).toLowerCase()} <span className="text-ink-faint">{mes.slice(0, 4)}</span>
        </p>
        <SeletorMes valor={mes} onChange={onMes} comDados={comDados} hoje={mesHoje} />
      </div>

      {vazio ? (
        <p className="mt-4 text-2xl font-bold text-ink-faint">Nada lançado neste mês ainda.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p
              className={`text-[44px] font-extrabold leading-none tracking-tight tabular-nums ${
                resultado < 0 ? 'text-expense' : 'text-income'
              }`}
            >
              {resultado < 0 ? '−' : '+'}
              {formatCurrency(Math.abs(resultado))}
            </p>
            <div className="pb-1">
              <p className="text-base font-bold text-ink">
                {resultado < 0 ? 'Faltou no mês' : 'Sobrou no mês'}
                {entrou > 0 && (
                  <span className="font-semibold text-ink-muted"> · {pctTexto((Math.abs(resultado) / entrou) * 100)} da receita</span>
                )}
              </p>
              {antes !== null && antes !== resultado && (
                <p className={`text-xs font-semibold tabular-nums ${resultado > antes ? 'text-income' : 'text-expense'}`}>
                  {resultado > antes ? '▲' : '▼'} {formatCurrency(Math.abs(resultado - antes))} {resultado > antes ? 'melhor' : 'pior'} que{' '}
                  {nomeAntes}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {[
              { rotulo: 'Entrou', valor: entrou, pos: posReceita, cor: 'var(--color-income)', nota: '' },
              {
                rotulo: 'Saiu',
                valor: saiu,
                pos: posSaiu,
                cor: 'var(--color-expense)',
                nota: entrou > 0 ? `${pctTexto((saiu / entrou) * 100)} da receita` : '',
              },
            ].map((b) => (
              <div key={b.rotulo} className="grid grid-cols-[52px_1fr_212px] items-center gap-3">
                <span className="text-xs font-semibold text-ink-muted">{b.rotulo}</span>
                <div className="relative h-3.5 overflow-hidden rounded-full bg-ink/[0.06] dark:bg-white/[0.06]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${b.rotulo === 'Saiu' ? Math.min(b.pos, posReceita) : b.pos}%`,
                      background: `color-mix(in srgb, ${b.cor} ${b.rotulo === 'Saiu' ? 45 : 75}%, transparent)`,
                      transition: 'width 500ms ease-out',
                    }}
                  />
                  {b.rotulo === 'Saiu' && b.pos > posReceita && (
                    <div
                      className="absolute inset-y-0 rounded-r-full"
                      style={{ left: `${posReceita}%`, width: `${b.pos - posReceita}%`, background: b.cor }}
                    />
                  )}
                  {entrou > 0 && saiu > entrou && (
                    <div aria-hidden className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: `calc(${posReceita}% - 1px)` }} />
                  )}
                </div>
                <span className="whitespace-nowrap text-left text-sm font-bold tabular-nums text-ink">
                  {formatCurrency(b.valor)}
                  {b.nota && (
                    <span className={`ml-1.5 text-xs font-semibold ${saiu > entrou ? 'text-expense' : 'text-ink-muted'}`}>{b.nota}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-4 text-[11px] text-ink-faint">
        Competência: cada valor entra no mês da compra ou da entrada, não no dia em que saiu do banco. Ref.{' '}
        {rotuloMes(mes)}.
      </p>
    </header>
  )
}
