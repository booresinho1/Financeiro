import { useState } from 'react'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Modal } from '@/components/ui/Modal'
import type { Detalhe } from '@/lib/detalhes'
import { formatCurrency, formatDate, nomeBonito } from '@/lib/format'
import { useChartColors } from '@/lib/chartTheme'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const ITENS_INICIAIS = 8

function rotuloMes(mes: string) {
  return `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`
}

function TooltipHistorico({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload: { mes: string; valor: number } }[]
}) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] shadow-pop">
      <span className="text-ink-muted">{rotuloMes(p.mes)} · </span>
      <span className="font-semibold text-ink">{formatCurrency(p.valor)}</span>
    </div>
  )
}

export function ModalDetalhe({ detalhe, onClose }: { detalhe: Detalhe; onClose: () => void }) {
  const cores = useChartColors()
  const [mostrarTudo, setMostrarTudo] = useState(false)
  const { historico, divisao, itens } = detalhe

  const media =
    historico && historico.length > 1
      ? historico.slice(0, -1).reduce((s, h) => s + h.valor, 0) / (historico.length - 1)
      : null
  const temNegativo = historico?.some((h) => h.valor < 0)
  // divisão com valores negativos é uma "conta" (soma e subtrai), não uma fatia
  const ehConta = divisao?.some((d) => d.valor < 0) ?? false
  const totalDivisao = divisao?.reduce((s, d) => s + Math.abs(d.valor), 0) ?? 0
  const itensVisiveis = mostrarTudo ? itens : itens.slice(0, ITENS_INICIAIS)

  return (
    <Modal title={nomeBonito(detalhe.titulo)} subtitle={detalhe.subtitulo} onClose={onClose} size="lg">
      <div className="h-1 -mt-2 mb-5 w-12 rounded-full" style={{ background: detalhe.cor }} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {detalhe.estatisticas.map((e) => (
          <div key={e.rotulo} className="rounded-xl bg-surface-2/70 p-3">
            <p className="text-[11px] text-ink-faint">{e.rotulo}</p>
            <p
              className={`mt-1 text-[17px] font-semibold tracking-tight ${
                e.tom === 'bom' ? 'text-income' : e.tom === 'ruim' ? 'text-expense' : 'text-ink'
              }`}
            >
              {e.valor}
            </p>
            {e.nota && <p className="mt-0.5 truncate text-[11px] text-ink-faint">{e.nota}</p>}
          </div>
        ))}
      </div>

      {historico && (
        <div className="mt-6">
          <p className="mb-2 text-[12px] font-medium text-ink-muted">{detalhe.historicoTitulo}</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={historico} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="mes"
                tickFormatter={rotuloMes}
                tick={{ fill: cores.inkMuted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<TooltipHistorico />} cursor={{ fill: cores.cursorFill, radius: 6 }} />
              {temNegativo && <ReferenceLine y={0} stroke={cores.grid} />}
              {media !== null && (
                <ReferenceLine
                  y={media}
                  stroke={cores.inkMuted}
                  strokeDasharray="4 4"
                  label={{
                    value: 'média',
                    position: 'insideTopRight',
                    fill: cores.inkMuted,
                    fontSize: 10,
                  }}
                />
              )}
              <Bar dataKey="valor" radius={[4, 4, 4, 4]} maxBarSize={32}>
                {historico.map((h, i) => (
                  <Cell
                    key={h.mes}
                    fill={temNegativo ? (h.valor >= 0 ? cores.income : cores.expense) : detalhe.cor}
                    fillOpacity={i === historico.length - 1 ? 1 : 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {divisao && divisao.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[12px] font-medium text-ink-muted">{detalhe.divisaoTitulo}</p>
          {ehConta ? (
            <div className="rounded-xl bg-surface-2/60 px-3 py-1">
              {divisao.map((d) => (
                <div
                  key={d.nome}
                  className="flex items-center justify-between border-b border-line-soft py-2 text-[13px] last:border-0"
                >
                  <span className="text-ink-soft">{nomeBonito(d.nome)}</span>
                  <span className={`font-semibold ${d.valor < 0 ? 'text-expense' : 'text-ink'}`}>
                    {d.valor < 0 ? '−' : '+'} {formatCurrency(Math.abs(d.valor))}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t-2 border-line py-2 text-[13px]">
                <span className="font-semibold text-ink">
                  {detalhe.divisaoTotalTitulo ?? 'Fim do mês'}
                </span>
                <span className="font-semibold text-ink">
                  {formatCurrency(divisao.reduce((s, d) => s + d.valor, 0))}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {divisao.map((d) => (
                <div key={d.nome}>
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate text-ink-soft">{nomeBonito(d.nome)}</span>
                    <span className="shrink-0">
                      <b className="font-semibold text-ink">{formatCurrency(d.valor)}</b>
                      <span className="ml-2 text-[11px] text-ink-faint">
                        {totalDivisao ? ((d.valor / totalDivisao) * 100).toFixed(0) : 0}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalDivisao ? (d.valor / totalDivisao) * 100 : 0}%`,
                        background: detalhe.cor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {itens.length > 0 && (
        <div className="mt-6">
          <p className="mb-1 text-[12px] font-medium text-ink-muted">{detalhe.itensTitulo}</p>
          <ul className="divide-y divide-line-soft">
            {itensVisiveis.map((it) => (
              <li key={it.id} className="flex items-center gap-3 py-2">
                <span className="w-12 shrink-0 text-[12px] text-ink-faint">
                  {formatDate(it.data).slice(0, 5)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">{it.titulo}</span>
                  {it.subtitulo && (
                    <span
                      className={`block truncate text-[11px] ${it.tom === 'alerta' ? 'text-expense' : 'text-ink-faint'}`}
                    >
                      {it.subtitulo.split(' · ').map(nomeBonito).join(' · ')}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 text-[13px] font-semibold ${it.tom === 'entrada' ? 'text-income' : 'text-ink'}`}
                >
                  {it.tom === 'entrada' ? '+' : ''}
                  {formatCurrency(it.valor)}
                </span>
              </li>
            ))}
          </ul>
          {itens.length > ITENS_INICIAIS && (
            <button
              type="button"
              onClick={() => setMostrarTudo((v) => !v)}
              className="mt-2 text-[12px] font-medium text-brand hover:underline"
            >
              {mostrarTudo ? 'Mostrar menos' : `Mostrar todos (${itens.length})`}
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}
