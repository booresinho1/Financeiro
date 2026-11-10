import { useState, type ReactNode } from 'react'
import {
  WalletCards,
  Layers,
  CalendarRange,
  ReceiptText,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCartoes } from '@/hooks/useCartoes'
import { hojeIso } from '@/lib/datas'
import { formatCurrency, formatDate } from '@/lib/format'
import type { CartaoResumo } from '@/types/finance'

const COMPRAS_INICIAIS = 8
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function diaMes(iso: string): string {
  return formatDate(iso).slice(0, 5)
}

function mesAno(iso: string): string {
  return `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}`
}

function diasAte(iso: string, hoje: string): number {
  const dia = (d: string) => {
    const [a, m, x] = d.split('-').map(Number)
    return Date.UTC(a, m - 1, x)
  }
  return Math.round((dia(iso) - dia(hoje)) / 86_400_000)
}

function Bloco({
  titulo,
  subtitulo,
  icone: Icone,
  acao,
  children,
}: {
  titulo: string
  subtitulo?: string
  icone: LucideIcon
  acao?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="animate-surgir rounded-2xl border border-line bg-surface p-5 shadow-card dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.04)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Icone className="h-4 w-4" strokeWidth={2.1} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
            {subtitulo && <p className="mt-0.5 text-xs text-ink-faint">{subtitulo}</p>}
          </div>
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

function SituacaoUltimaFatura({ cartao, hoje }: { cartao: CartaoResumo; hoje: string }) {
  const f = cartao.ultimaFatura
  if (!f) return null

  let icone = <Clock className="h-4 w-4 text-ink-muted" />
  let texto = `Vence em ${diaMes(f.vencimento)}`
  if (f.total <= 0) {
    texto = 'Fatura sem valor a pagar'
  } else if (f.pago >= f.total - 0.01) {
    icone = <CheckCircle2 className="h-4 w-4 text-income" />
    texto = f.dataPagamento ? `Paga em ${diaMes(f.dataPagamento)}` : 'Paga'
  } else if (f.pago > 0) {
    icone = <AlertTriangle className="h-4 w-4 text-warning" />
    texto = `Pago ${formatCurrency(f.pago)} de ${formatCurrency(f.total)}`
  } else if (f.vencimento < hoje) {
    icone = <AlertTriangle className="h-4 w-4 text-expense" />
    texto = 'Nenhum pagamento identificado'
  }

  return (
    <section className="animate-surgir flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="min-w-0">
        <p className="text-xs text-ink-faint">Última fatura fechada · venceu {diaMes(f.vencimento)}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
          {icone}
          {texto}
        </p>
      </div>
      <p className="shrink-0 text-lg font-semibold tracking-tight text-ink">
        {formatCurrency(f.total)}
      </p>
    </section>
  )
}

function PainelFatura({ cartao, hoje }: { cartao: CartaoResumo; hoje: string }) {
  const { faturaAberta: f, limite, limiteDisponivel, usado } = cartao
  // o que ainda falta pagar: pagamento adiantado (saído da conta do banco) já abateu da previsão
  const falta = Math.max(f.total - f.pago, 0)
  const texto = formatCurrency(falta)
  const virgula = texto.lastIndexOf(',')
  const percentual = limite ? Math.min(100, (usado / limite) * 100) : null
  const dias = f.vencimentoEstimado ? diasAte(f.vencimentoEstimado, hoje) : null

  return (
    <section className="animate-surgir relative overflow-hidden rounded-3xl bg-panel p-6 text-panel-ink shadow-xl shadow-[#5b4cf0]/20 md:p-7 dark:shadow-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#6d5efc]/45 blur-3xl"
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-white/60">
            {f.pago > 0 ? 'Fatura aberta · falta pagar' : 'Fatura aberta · previsão'}
          </p>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] text-white/70">
            {[cartao.bandeira, cartao.final && `final ${cartao.final}`].filter(Boolean).join(' · ') ||
              cartao.nome}
          </span>
        </div>

        <p className="mt-3 truncate text-[3.4rem] font-semibold leading-none tracking-[-0.045em]">
          {texto.slice(0, virgula)}
          <span className="text-[2.2rem] text-white/35">{texto.slice(virgula)}</span>
        </p>

        {f.pago > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/85">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
            Já pagou {formatCurrency(f.pago)}
            {f.pagoEm && ` em ${diaMes(f.pagoEm)}`} · de {formatCurrency(f.total)}
          </p>
        )}

        {f.vencimentoEstimado && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-[#0e1016]">
              Vence por volta de {diaMes(f.vencimentoEstimado)}
            </span>
            {dias !== null && dias >= 0 && (
              <span className="text-xs text-white/50">em {dias} dia(s)</span>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
          <div>
            <p className="text-[11px] text-white/50">Já lançado</p>
            <p className="mt-0.5 text-base font-semibold">{formatCurrency(f.lancado)}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/50">Parcelas que ainda entram</p>
            <p className="mt-0.5 text-base font-semibold">{formatCurrency(f.parcelasPrevistas)}</p>
          </div>
        </div>

        {f.fechamentoEstimado && (
          <p className="mt-3 text-[11px] text-white/45">
            Fecha por volta de {diaMes(f.fechamentoEstimado)}. Compras até lá ainda somam nesta fatura.
          </p>
        )}

        {limite !== null && percentual !== null && (
          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-2 text-[11px] text-white/55">
              <span>
                Limite usado{' '}
                <b className={`font-semibold ${percentual >= 90 ? 'text-[#ff8a8f]' : 'text-white'}`}>
                  {percentual.toFixed(0)}%
                </b>
              </span>
              <span>
                {limiteDisponivel !== null && `${formatCurrency(limiteDisponivel)} livres de `}
                {formatCurrency(limite)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${percentual >= 90 ? 'bg-[#ff8a8f]' : 'bg-accent'}`}
                style={{ width: `${percentual}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-white/45">
              {formatCurrency(usado)} usados, contando as parcelas que ainda vão vencer.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function CartaoDetalhe({ cartao, hoje }: { cartao: CartaoResumo; hoje: string }) {
  const [verTodas, setVerTodas] = useState(false)
  const { compras } = cartao.faturaAberta
  const visiveis = verTodas ? compras : compras.slice(0, COMPRAS_INICIAIS)
  const maiorProxima = Math.max(1, ...cartao.proximasFaturas.map((f) => f.valor))
  const maiorFatura = Math.max(1, ...cartao.faturas.map((f) => f.total))

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-5">
        <PainelFatura cartao={cartao} hoje={hoje} />
        <SituacaoUltimaFatura cartao={cartao} hoje={hoje} />

        <Bloco
          titulo="Faturas anteriores"
          subtitulo={`Últimas ${cartao.faturas.length}, pela data de vencimento`}
          icone={History}
        >
          <ul className="space-y-3">
            {cartao.faturas.map((f) => (
              <li key={f.id}>
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="text-ink-soft">{mesAno(f.vencimento)}</span>
                  <span className="font-semibold text-ink">{formatCurrency(f.total)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-brand/70"
                    style={{ width: `${(f.total / maiorFatura) * 100}%` }}
                  />
                </div>
                {f.encargos >= 1 && (
                  <p className="mt-1 text-[11px] text-expense">
                    {formatCurrency(f.encargos)} de juros e encargos
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Bloco>
      </div>

      <div className="space-y-4 lg:col-span-7">
        <Bloco
          titulo="Parcelas em andamento"
          subtitulo={
            cartao.parcelas.length
              ? `${formatCurrency(cartao.totalParcelasRestantes)} ainda por vir`
              : 'Nenhuma compra parcelada em aberto'
          }
          icone={Layers}
        >
          {cartao.parcelas.length > 0 && (
            <ul className="-my-2 divide-y divide-line-soft">
              {cartao.parcelas.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{p.descricao}</p>
                      <p className="text-[11px] text-ink-faint">
                        {p.total}x de {formatCurrency(p.valor)}
                        {p.dataCompra && ` · comprado em ${formatDate(p.dataCompra)}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[13px] font-semibold text-ink">
                        {formatCurrency(p.valorRestante)}
                      </p>
                      <p className="text-[11px] text-ink-faint">faltam {p.restantes}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-0.5" aria-label={`Parcela ${p.numero} de ${p.total}`}>
                    {Array.from({ length: p.total }, (_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${i < p.numero ? 'bg-brand' : 'bg-surface-2'}`}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        {cartao.proximasFaturas.length > 0 && (
          <Bloco
            titulo="Próximas faturas"
            subtitulo="Só o que já está comprado em parcelas. Novas compras somam a isso."
            icone={CalendarRange}
          >
            <ul className="space-y-2.5">
              {cartao.proximasFaturas.map((f, i) => (
                <li key={f.vencimentoEstimado ?? i} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-[12px] text-ink-muted">
                    {f.vencimentoEstimado ? mesAno(f.vencimentoEstimado) : `+${i + 1} mês`}
                  </span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-brand"
                      style={{ width: `${(f.valor / maiorProxima) * 100}%` }}
                    />
                  </span>
                  <span className="w-24 shrink-0 text-right text-[13px] font-semibold text-ink">
                    {formatCurrency(f.valor)}
                  </span>
                </li>
              ))}
            </ul>
          </Bloco>
        )}

        <Bloco
          titulo="Compras na fatura aberta"
          subtitulo={`${compras.length} lançamento(s) · ${formatCurrency(cartao.faturaAberta.lancado)}`}
          icone={ReceiptText}
        >
          {compras.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-ink-faint">
              Nenhuma compra nesta fatura ainda.
            </p>
          ) : (
            <>
              <ul className="-my-2 divide-y divide-line-soft">
                {visiveis.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-11 shrink-0 text-[12px] text-ink-faint">{diaMes(c.data)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{c.descricao}</span>
                      {(c.parcela || (c.finalCartao && c.finalCartao !== cartao.final)) && (
                        <span className="block text-[11px] text-ink-faint">
                          {[
                            c.parcela && `parcela ${c.parcela}`,
                            c.finalCartao && c.finalCartao !== cartao.final && `final ${c.finalCartao}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 text-[13px] font-semibold ${c.valor < 0 ? 'text-income' : 'text-ink'}`}
                    >
                      {formatCurrency(c.valor)}
                    </span>
                  </li>
                ))}
              </ul>
              {compras.length > COMPRAS_INICIAIS && (
                <button
                  type="button"
                  onClick={() => setVerTodas((v) => !v)}
                  className="mt-3 text-[12px] font-medium text-brand hover:underline"
                >
                  {verTodas ? 'Mostrar menos' : `Mostrar todas (${compras.length})`}
                </button>
              )}
            </>
          )}
        </Bloco>
      </div>
    </div>
  )
}

export function Cartao() {
  const { cartoes, carregando, erro } = useCartoes()
  const hoje = hojeIso()
  const atualizadoEm = cartoes[0]?.atualizadoEm

  return (
    <>
      <PageHeader
        title="Cartão"
        subtitle={
          atualizadoEm
            ? `Fatura, limite e parcelas, direto do banco · atualizado ${formatDate(atualizadoEm)}`
            : 'Fatura, limite e parcelas, direto do banco'
        }
      />

      {erro && <p className="mb-4 text-sm text-expense">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-ink-faint">Buscando os dados no banco...</p>
      ) : cartoes.length === 0 ? (
        !erro && (
          <EmptyState
            icon={WalletCards}
            title="Nenhum cartão conectado"
            description="Conecte o banco na tela Bancos para ver a fatura e as parcelas aqui."
          />
        )
      ) : (
        <div className="space-y-8">
          {cartoes.map((c) => (
            <CartaoDetalhe key={c.id} cartao={c} hoje={hoje} />
          ))}
        </div>
      )}
    </>
  )
}
