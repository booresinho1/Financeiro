import { Modal } from '@/components/ui/Modal'
import type { Analise, ClasseDesejo, Desejo, Veredito } from '@/lib/desejos'
import { formatCurrency } from '@/lib/format'
import { DetalhesDesejo, nf, pctCofrinho, textoVeredito, type AcoesDesejo } from './DetalhesDesejo'
import { FotoDesejo } from './FotoDesejo'

/** Janela de um desejo aberta pelo mapa: foto, cofrinho, especificações e simulação. */
export function DesejoModal({ item, a, v, cls, acoes, onClose }: { item: Desejo; a: Analise; v: Veredito; cls: ClasseDesejo; acoes: AcoesDesejo; onClose: () => void }) {
  const vt = textoVeredito(v)
  const pct = pctCofrinho(item, v)
  const unico = item.tipo === 'UNICO'
  // cada ação fecha a janela antes de abrir a próxima
  const fechando = (f: () => void) => () => {
    onClose()
    f()
  }
  return (
    <Modal title={item.nome} subtitle={`${cls.emoji} ${cls.nome} · ${v.posicao}º da fila`} onClose={onClose} size="lg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <FotoDesejo imagem={item.imagem} emoji={cls.emoji} tamanho={168} className="mx-auto rounded-2xl ring-1 ring-inset ring-line sm:mx-0" />
        <div className="flex flex-1 flex-col justify-between gap-3">
          <div>
            <p className="text-[32px] font-extrabold leading-none tracking-tight tabular-nums text-ink">
              {formatCurrency(item.valor)}
              {!unico && <span className="text-base font-bold text-ink-muted">/mês</span>}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{nf(a.diasSalario)} dias de salário</p>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-sm font-extrabold ${vt.classe}`}>{vt.texto}</span>
              {unico && (
                <span className="text-2xl font-extrabold tabular-nums" style={{ color: vt.cor }}>
                  {nf(pct, 0)}%
                </span>
              )}
            </div>
            {unico && (
              <>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: vt.cor }} />
                </div>
                <p className="mt-1 text-[11px] text-ink-muted tabular-nums">
                  {formatCurrency(v.juntado)} de {formatCurrency(item.valor)} já juntado
                </p>
              </>
            )}
            {v.atrasa && <p className="mt-1 text-[11px] font-semibold text-warning">passa da data que você queria</p>}
            {v.parcelaCabe && v.tipo !== 'agora' && <p className="mt-1 text-[11px] text-ink-muted">ou parcelado já: a parcela cabe na sobra</p>}
          </div>
        </div>
      </div>
      <div className="mt-5 border-t border-line-soft pt-4">
        <DetalhesDesejo
          item={item}
          a={a}
          v={v}
          cls={cls}
          colunas={3}
          acoes={{ onReservar: acoes.onReservar, onSimular: fechando(acoes.onSimular), onRealizar: fechando(acoes.onRealizar), onEditar: fechando(acoes.onEditar), onExcluir: acoes.onExcluir }}
        />
      </div>
    </Modal>
  )
}
