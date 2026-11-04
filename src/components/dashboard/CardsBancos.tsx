import { Link } from 'react-router-dom'
import { ArrowRight, Plus, AlertTriangle, Landmark } from 'lucide-react'
import { BANCOS_ESPERADOS, type BancoEsperado } from '@/lib/bancos'
import { hojeIso } from '@/lib/datas'
import { formatCurrency, formatDate } from '@/lib/format'
import type { BancoConectado, ContaBanco } from '@/types/finance'

function LogoBanco({ src, nome, apagado }: { src: string | null; nome: string; apagado?: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-line ${apagado ? 'opacity-50 grayscale' : ''}`}
    >
      {src ? (
        <img src={src} alt={nome} className="h-full w-full object-contain" />
      ) : (
        <span className="text-sm font-bold text-ink-muted">{nome[0]}</span>
      )}
    </span>
  )
}

function quando(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${formatDate(iso)} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function LinhaConta({ conta }: { conta: ContaBanco }) {
  if (conta.tipo === 'CREDIT') {
    return (
      <div className="py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-ink-soft truncate">{conta.nome}</p>
          <p className="text-sm font-semibold text-expense shrink-0">
            {formatCurrency(Math.abs(conta.saldo))}
          </p>
        </div>
        <p className="text-[11px] text-ink-faint">
          Fatura atual
          {/* o resumo do cartão pode trazer um vencimento já passado: esse não informa nada */}
          {conta.vencimento &&
            conta.vencimento >= hojeIso() &&
            ` · vence ${formatDate(conta.vencimento).slice(0, 5)}`}
          {conta.limiteDisponivel !== null &&
            ` · ${formatCurrency(conta.limiteDisponivel)} de limite livre`}
        </p>
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <p className="text-sm text-ink-soft truncate">{conta.nome}</p>
      <p
        className={`text-base font-bold tracking-tight shrink-0 ${conta.saldo < 0 ? 'text-expense' : 'text-ink'}`}
      >
        {formatCurrency(conta.saldo)}
      </p>
    </div>
  )
}

function CardBanco({ banco }: { banco: BancoConectado }) {
  const desatualizado = banco.status !== 'UPDATED'
  return (
    <div className="rounded-2xl border border-line bg-surface shadow-card overflow-hidden">
      <div className="h-1" style={{ background: banco.cor ?? 'var(--color-brand)' }} />
      <div className="p-4">
        <div className="flex items-center gap-3">
          <LogoBanco src={banco.imageUrl} nome={banco.nome} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{banco.nome}</p>
            <p
              className={`flex items-center gap-1 text-[11px] ${desatualizado ? 'text-warning' : 'text-ink-faint'}`}
            >
              {desatualizado && <AlertTriangle className="h-3 w-3" />}
              {desatualizado
                ? 'Conexão precisa de atenção'
                : `Atualizado ${quando(banco.atualizadoEm)}`}
            </p>
          </div>
        </div>
        {banco.contas.length > 0 && (
          <div className="mt-2 divide-y divide-line-soft">
            {banco.contas.map((c) => (
              <LinhaConta key={c.id} conta={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CardBancoDesconectado({ nome, imageUrl }: { nome: string; imageUrl: string }) {
  return (
    <Link
      to="/bancos"
      className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-4 hover:border-brand/50 transition-colors"
    >
      <LogoBanco src={imageUrl} nome={nome} apagado />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-soft">{nome}</p>
        <p className="text-[11px] text-ink-faint">Não conectado</p>
      </div>
      <span className="flex items-center gap-1 text-xs font-semibold text-brand">
        <Plus className="h-3.5 w-3.5" />
        Conectar
      </span>
    </Link>
  )
}

export function CardsBancos({
  bancos,
  carregando,
  erro,
}: {
  bancos: BancoConectado[]
  carregando: boolean
  erro: string | null
}) {
  // pelo MeuPluggy o conector se chama "MeuPluggy": o banco só aparece no nome das contas
  const ehDoBanco = (e: BancoEsperado, b: BancoConectado) =>
    e.teste.test(b.nome) || b.contas.some((c) => e.teste.test(c.nome))

  const esperados = BANCOS_ESPERADOS.map((e) => ({
    esperado: e,
    conectados: bancos
      .filter((b) => ehDoBanco(e, b))
      .map((b) => ({ ...b, nome: e.nome, imageUrl: e.imageUrl, cor: e.cor })),
  }))
  const outros = bancos.filter((b) => !BANCOS_ESPERADOS.some((e) => ehDoBanco(e, b)))

  const totalEmConta = bancos
    .flatMap((b) => b.contas)
    .filter((c) => c.tipo !== 'CREDIT')
    .reduce((s, c) => s + c.saldo, 0)

  return (
    <div className="animate-surgir space-y-3" style={{ animationDelay: '60ms' }}>
      <div className="flex items-center justify-between gap-3 px-1 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Landmark className="h-4 w-4" strokeWidth={2.1} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Bancos</p>
            <p className="text-xs text-ink-faint">Saldos direto do banco</p>
          </div>
        </div>
        {bancos.length > 0 ? (
          <span className="text-xs text-ink-muted">
            Em conta <strong className="text-ink">{formatCurrency(totalEmConta)}</strong>
          </span>
        ) : (
          <Link
            to="/bancos"
            className="flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-brand"
          >
            Gerenciar <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {erro && <p className="px-1 text-xs text-expense">Não foi possível ler os saldos: {erro}</p>}

      {carregando ? (
        <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-ink-faint shadow-card animate-pulse">
          Buscando saldos nos bancos...
        </div>
      ) : (
        <>
          {esperados.map(({ esperado, conectados }) =>
            conectados.length ? (
              conectados.map((b) => <CardBanco key={b.itemId} banco={b} />)
            ) : (
              <CardBancoDesconectado
                key={esperado.nome}
                nome={esperado.nome}
                imageUrl={esperado.imageUrl}
              />
            )
          )}
          {outros.map((b) => (
            <CardBanco key={b.itemId} banco={b} />
          ))}
        </>
      )}
    </div>
  )
}
