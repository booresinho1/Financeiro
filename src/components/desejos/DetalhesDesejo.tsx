import { useState } from 'react'
import { CheckCircle2, ExternalLink, FlaskConical, Pencil, Trash2 } from 'lucide-react'
import type { Analise, ClasseDesejo, Desejo, Veredito } from '@/lib/desejos'
import { rotuloMes } from '@/lib/dre'
import { formatCurrency, formatDate } from '@/lib/format'

export const nf = (v: number, d = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: d })

export function textoVeredito(v: Veredito): { texto: string; classe: string; cor: string } {
  switch (v.tipo) {
    case 'agora':
      return { texto: 'Cabe agora', classe: 'text-income', cor: 'var(--color-income)' }
    case 'mensalOk':
      return { texto: 'Cabe no mês', classe: 'text-income', cor: 'var(--color-income)' }
    case 'mes':
      return { texto: `À vista em ${rotuloMes(v.mes!)}`, classe: v.atrasa ? 'text-warning' : 'text-ink', cor: v.atrasa ? 'var(--color-warning)' : 'var(--color-brand)' }
    default:
      return { texto: 'Não cabe sem cortar', classe: 'text-expense', cor: 'var(--color-expense)' }
  }
}

/** Quanto do separado já está reservado para o desejo (o cofrinho), em %. */
export function pctCofrinho(d: Desejo, v: Veredito): number {
  if (d.tipo === 'UNICO') return d.valor > 0 ? Math.min((v.juntado / d.valor) * 100, 100) : 0
  return v.tipo === 'mensalOk' ? 100 : 0
}

export interface AcoesDesejo {
  /** dinheiro guardado só para este desejo */
  onReservar: (valor: number) => void
  onSimular: () => void
  onRealizar: () => void
  onEditar: () => void
  onExcluir: () => void
}

/** Especificações, observação, link e ações de um desejo: usado na fila e na janela do mapa. */
export function DetalhesDesejo({ item, a, v, cls, acoes, colunas = 4 }: { item: Desejo; a: Analise; v: Veredito; cls: ClasseDesejo; acoes: AcoesDesejo; colunas?: 3 | 4 }) {
  const unico = item.tipo === 'UNICO'
  return (
    <>
      {unico && <CampoReserva item={item} v={v} onReservar={acoes.onReservar} />}
      <div className={`grid grid-cols-2 gap-x-6 gap-y-2.5 text-xs ${colunas === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <Info rotulo="Classe" valor={`${cls.emoji} ${cls.nome}`} />
        <Info rotulo="Nota" valor={`${a.gut} × ${nf(a.peso, 2)} → ${a.importancia.toFixed(0)}`} dica="G×U×T vezes o peso da classe" />
        {a.custoPorMes !== null && unico && <Info rotulo="Custo por mês de uso" valor={formatCurrency(a.custoPorMes)} dica="valor ÷ quantos meses dura" />}
        <Info rotulo="G · U · T" valor={`${item.g} · ${item.u} · ${item.t}`} />
        <Info rotulo="Dias de salário" valor={nf(a.diasSalario)} />
        <Info rotulo="% da sobra mensal" valor={a.pctSobra !== null ? `${nf(a.pctSobra, 0)}%` : '—'} />
        <Info rotulo="Custo-benefício" valor={nf(a.custoBeneficio, 0)} dica="importância por dia de salário" />
        {item.parcelas && <Info rotulo="Parcelado" valor={`${item.parcelas.n}× ${formatCurrency(item.parcelas.valor)}${a.juros ? ` (+${formatCurrency(a.juros)})` : ''}`} />}
        {a.economiaAlternativa && <Info rotulo="Alternativa" valor={`economiza ${formatCurrency(a.economiaAlternativa)}`} />}
        {item.dataDesejada && <Info rotulo="Você quer para" valor={formatDate(item.dataDesejada)} />}
        {v.cortePorMes !== undefined && v.cortePorMes > 0 && <Info rotulo="Para caber em 12 meses" valor={`faltam ${formatCurrency(v.cortePorMes)}/mês`} alerta />}
      </div>
      {(item.observacao || item.link) && (
        <div className="mt-3 rounded-xl bg-surface-2/50 px-3 py-2.5 text-xs">
          {item.observacao && <p className="whitespace-pre-wrap text-ink-soft">{item.observacao}</p>}
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex max-w-full items-center gap-1.5 font-semibold text-brand hover:underline ${item.observacao ? 'mt-2' : ''}`}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.link.replace(/^https?:\/\//i, '')}</span>
            </a>
          )}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button onClick={acoes.onSimular} className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-hover">
          <FlaskConical className="h-3.5 w-3.5" /> E se eu fizer?
        </button>
        <button onClick={acoes.onRealizar} className="flex items-center gap-1.5 rounded-lg bg-income px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
          <CheckCircle2 className="h-3.5 w-3.5" /> Realizei
        </button>
        <button onClick={acoes.onEditar} className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-ink">
          <Pencil className="h-3.5 w-3.5" /> Editar
        </button>
        <button onClick={acoes.onExcluir} className="flex items-center gap-1 text-xs font-semibold text-expense">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>
    </>
  )
}

/** "Guardei para ele": o dinheiro que é só deste desejo, fora do separado livre. */
function CampoReserva({ item, v, onReservar }: { item: Desejo; v: Veredito; onReservar: (valor: number) => void }) {
  const [texto, setTexto] = useState(item.reservado ? String(item.reservado).replace('.', ',') : '')
  const proprio = Math.min(item.reservado ?? 0, item.valor)
  const doSeparado = Math.max(v.juntado - proprio, 0)
  const falta = Math.max(item.valor - v.juntado, 0)
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-surface-2/50 px-3 py-2.5">
      <label htmlFor={`reserva-${item.id}`} className="text-xs font-semibold text-ink-soft">
        Guardei para ele
      </label>
      <span className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1">
        <span className="text-xs text-ink-muted">R$</span>
        <input
          id={`reserva-${item.id}`}
          inputMode="decimal"
          value={texto}
          placeholder="0"
          onChange={(e) => {
            setTexto(e.target.value)
            onReservar(Number(e.target.value.replace(',', '.')) || 0)
          }}
          className="w-24 bg-transparent text-right text-sm font-extrabold tabular-nums text-ink outline-none"
        />
      </span>
      <span className="text-[11px] tabular-nums text-ink-muted">
        {proprio > 0 && <>seu {formatCurrency(proprio)}</>}
        {proprio > 0 && doSeparado > 0 && ' + '}
        {doSeparado > 0 && <>do separado {formatCurrency(doSeparado)}</>}
        {(proprio > 0 || doSeparado > 0) && ' · '}
        {falta > 0 ? <>faltam <b className="text-ink-soft">{formatCurrency(falta)}</b></> : <b className="text-income">completo</b>}
      </span>
    </div>
  )
}

function Info({ rotulo, valor, dica, alerta }: { rotulo: string; valor: string; dica?: string; alerta?: boolean }) {
  return (
    <div title={dica}>
      <p className="text-[11px] text-ink-faint">{rotulo}</p>
      <p className={`font-bold tabular-nums ${alerta ? 'text-expense' : 'text-ink'}`}>{valor}</p>
    </div>
  )
}
