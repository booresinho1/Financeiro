import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, ExternalLink, Layers, Plus, RotateCcw, Sparkles, Trash2, Trophy, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { DesejoFormModal } from '@/components/desejos/DesejoFormModal'
import { MapaDesejos } from '@/components/desejos/MapaDesejos'
import { ComboModal } from '@/components/desejos/ComboModal'
import { FotoDesejo } from '@/components/desejos/FotoDesejo'
import { LinhaDoTempo } from '@/components/desejos/LinhaDoTempo'
import { QuadrantesDesejos } from '@/components/desejos/QuadrantesDesejos'
import { RealizarModal } from '@/components/desejos/RealizarModal'
import { useDespesas } from '@/hooks/useDespesas'
import { useEntradas } from '@/hooks/useEntradas'
import { desejosDeExemplo, useDesejos } from '@/hooks/useDesejos'
import { hojeIso } from '@/lib/datas'
import { classeDe, planejar, reservadoDe, type Capacidade, type Desejo } from '@/lib/desejos'
import { mesesAte, montarDre } from '@/lib/dre'
import { formatCurrency, formatDate } from '@/lib/format'
import { somarMeses } from '@/lib/datas'
import { DetalhesDesejo, nf, pctCofrinho, textoVeredito, type AcoesDesejo } from '@/components/desejos/DetalhesDesejo'
import { DesejoModal } from '@/components/desejos/DesejoModal'
export function Desejos() {
  const { despesas } = useDespesas()
  const { entradas } = useEntradas()
  const d = useDesejos()
  const hoje = hojeIso()

  const [editando, setEditando] = useState<Desejo | null>(null)
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [textoSobra, setTextoSobra] = useState('')
  // quando os dados chegam do servidor, o campo mostra a sobra simulada salva
  useEffect(() => {
    if (!d.carregando) setTextoSobra(d.sobraManual === null ? '' : String(d.sobraManual).replace('.', ','))
  }, [d.carregando]) // eslint-disable-line react-hooks/exhaustive-deps
  const [combo, setCombo] = useState<string[] | null>(null)
  const alternarMarca = (id: string) =>
    setMarcados((atual) => {
      const n = new Set(atual)
      if (!n.delete(id)) n.add(id)
      return n
    })
  const [novo, setNovo] = useState(false)
  const [aberto, setAberto] = useState<string | null>(null)
  const [verClasses, setVerClasses] = useState(false)
  const [realizando, setRealizando] = useState<Desejo | null>(null)
  const [janela, setJanela] = useState<string | null>(null)
  const acoesDe = (item: Desejo): AcoesDesejo => ({
    onReservar: (valor) => d.reservar(item.id, valor),
    onSimular: () => setCombo([item.id]),
    onRealizar: () => setRealizando(item),
    onEditar: () => setEditando(item),
    onExcluir: () => {
      if (!confirm(`Excluir "${item.nome}"?`)) return
      d.excluir(item.id)
      setJanela(null)
    },
  })
  // abre o desejo na fila e rola até ele (vindo da linha do tempo ou dos quadrantes)
  const irPara = (id: string) => {
    setAberto(id)
    requestAnimationFrame(() => document.getElementById(`desejo-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  // capacidade: média dos 3 meses fechados antes deste (ignora mês sem nenhum lançamento)
  const base = useMemo(() => {
    const meses = mesesAte(somarMeses(`${hoje.slice(0, 7)}-01`, -1).slice(0, 7), 3)
    const dre = montarDre(despesas, entradas, meses)
    const validos = meses.map((_, i) => i).filter((i) => dre.totalReceitas[i] > 0 || dre.totalDespesas[i] > 0)
    const media = (v: number[]) => (validos.length ? validos.reduce((s, i) => s + v[i], 0) / validos.length : 0)
    return { receitaMensal: media(dre.totalReceitas), sobraMensal: media(dre.resultado), meses: validos.length }
  }, [despesas, entradas, hoje])

  const simulandoSobra = d.sobraManual !== null
  const cap: Capacidade = { receitaMensal: base.receitaMensal, sobraMensal: d.sobraManual ?? base.sobraMensal, guardado: d.guardado }
  const plano = useMemo(() => planejar(d.desejos, d.classes, cap, d.ordem, hoje), [d.desejos, d.classes, cap.receitaMensal, cap.sobraMensal, cap.guardado, d.ordem, hoje]) // eslint-disable-line react-hooks/exhaustive-deps

  // quanto da receita vira sobra: abaixo de 10% aperta, acima de 20% está folgado
  const pctPoupanca = cap.receitaMensal > 0 ? (cap.sobraMensal / cap.receitaMensal) * 100 : null
  const corPoupanca =
    pctPoupanca === null || pctPoupanca < 0 ? 'var(--color-expense)' : pctPoupanca < 10 ? 'var(--color-warning)' : pctPoupanca < 20 ? 'var(--color-brand)' : 'var(--color-income)'

  const totalUnico = d.desejos.filter((x) => x.tipo === 'UNICO').reduce((s, x) => s + x.valor, 0)
  const totalReservado = d.desejos.reduce((s, x) => s + Math.min(reservadoDe(x), x.valor), 0)
  const totalMensal = d.desejos.filter((x) => x.tipo === 'MENSAL').reduce((s, x) => s + x.valor, 0)
  // com o mensal já descontado, o que sobra paga os desejos únicos; sem sobra livre não há prazo
  const sobraLivre = cap.sobraMensal - totalMensal
  const mesesParaTudo = sobraLivre > 0 ? Math.max(Math.ceil((totalUnico - totalReservado - d.guardado) / sobraLivre), 0) : null

  return (
    <>
      <PageHeader
        title="Desejos"
        subtitle="O que você quer, o quanto importa e quando cabe no seu bolso"
        action={
          <button onClick={() => setNovo(true)} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover shadow-sm shadow-black/10">
            <Plus className="h-4 w-4" />
            Novo desejo
          </button>
        }
      />

      <section className="mb-4 rounded-3xl border border-line bg-surface p-5 shadow-card md:p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1.5fr_1fr] sm:gap-8">
          <div>
            <p className="text-xs font-semibold text-ink-muted">{simulandoSobra ? 'Sobra por mês (simulada)' : 'Sobra média por mês'}</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3">
              <p className={`text-[40px] font-extrabold leading-none tracking-tight tabular-nums ${cap.sobraMensal < 0 ? 'text-expense' : simulandoSobra ? 'text-brand' : 'text-ink'}`}>{formatCurrency(cap.sobraMensal)}</p>
              {pctPoupanca !== null && (
                <p className="text-sm font-bold tabular-nums" style={{ color: corPoupanca }}>
                  {nf(pctPoupanca, 0)}% da receita
                </p>
              )}
            </div>
            {pctPoupanca !== null && (
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(pctPoupanca, 0), 100)}%`, background: corPoupanca, transition: 'width 500ms ease-out' }} />
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-ink-faint">
              {simulandoSobra ? (
                <>
                  a média real é <b className={base.sobraMensal < 0 ? 'text-expense' : 'text-ink-soft'}>{formatCurrency(base.sobraMensal)}</b>
                </>
              ) : (
                <>média dos últimos {base.meses || 3} meses fechados, pelo DRE</>
              )}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <label htmlFor="sobra-sim" className="text-[11px] text-ink-muted">
                Simular sobra de R$
              </label>
              <input
                id="sobra-sim"
                inputMode="decimal"
                value={textoSobra}
                placeholder="ex.: 400"
                onChange={(e) => {
                  setTextoSobra(e.target.value)
                  const t = e.target.value.replace(',', '.').trim()
                  d.definirSobraManual(t === '' || t === '-' || Number.isNaN(Number(t)) ? null : Number(t))
                }}
                className="w-24 rounded-lg border border-line bg-surface px-2 py-1 text-sm font-bold tabular-nums text-ink"
              />
              {simulandoSobra && (
                <button onClick={() => (setTextoSobra(''), d.definirSobraManual(null))} aria-label="Voltar para a média real" className="rounded-lg p-1 text-ink-muted hover:bg-surface-2">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-line-soft rounded-2xl bg-surface-2/50 px-4 sm:self-center">
            <div className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="block text-xs font-semibold text-ink-muted">Receita média</span>
                <span className="block text-[11px] text-ink-faint">1 dia de salário = {formatCurrency(base.receitaMensal / 30)}</span>
              </span>
              <span className="text-lg font-extrabold tabular-nums text-ink">{formatCurrency(base.receitaMensal)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <label htmlFor="guardado">
                <span className="block text-xs font-semibold text-ink-muted">Separado para desejos</span>
                <span className="block text-[11px] text-ink-faint">
                  {totalReservado > 0 ? <>livre para a fila · + {formatCurrency(totalReservado)} guardados nos desejos</> : 'livre para a fila, na ordem'}
                </span>
              </label>
              <span className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-1">
                <span className="text-xs text-ink-muted">R$</span>
                <input
                  id="guardado"
                  inputMode="decimal"
                  value={d.guardado || ''}
                  placeholder="0"
                  onChange={(e) => d.definirGuardado(Number(e.target.value.replace(',', '.')) || 0)}
                  className="w-20 bg-transparent text-right text-lg font-extrabold tabular-nums text-ink outline-none"
                />
              </span>
            </div>
          </div>
        </div>
      </section>

      {d.erro && (
        <p role="alert" className="mb-4 rounded-2xl bg-expense-soft px-4 py-3 text-sm font-semibold text-expense">
          Não foi possível falar com o servidor. <span className="font-normal">{d.erro}</span>
        </p>
      )}

      {d.carregando ? (
        <section className="rounded-3xl border border-line bg-surface px-6 py-14 text-center text-sm text-ink-muted">Carregando desejos…</section>
      ) : d.desejos.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-ink-faint" />
          <p className="mt-3 text-base font-bold text-ink">Nenhum desejo ainda</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">Cadastre o que você quer. O app dá nota de importância, mostra o custo real e diz quando cabe.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => setNovo(true)} className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
              Cadastrar o primeiro
            </button>
            <button onClick={() => d.carregarExemplos(desejosDeExemplo(hoje))} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-2">
              Ver com exemplos
            </button>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          <section className="rounded-3xl border border-line bg-surface p-5 shadow-card md:p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-bold tracking-tight text-ink">Quando cada um fica pronto</h2>
              <p className="text-xs text-ink-muted">com o separado e a sobra de cada mês · toque para abrir</p>
            </div>
            <LinhaDoTempo fila={plano.fila} veredito={plano.veredito} classes={d.classes} hoje={hoje} onAbrir={irPara} />
          </section>

          <section className="rounded-3xl border border-line bg-surface p-5 shadow-card md:p-6">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-bold tracking-tight text-ink">Mapa dos desejos</h2>
              <p className="hidden text-xs text-ink-muted sm:block">passe o mouse para ver · clique para abrir e simular</p>
              <p className="text-xs text-ink-muted sm:hidden">importância × custo em dias de salário</p>
            </div>
            <div className="hidden sm:block">
              <MapaDesejos desejos={d.desejos} analises={plano.analises} veredito={plano.veredito} classes={d.classes} onAbrir={setJanela} />
            </div>
            <div className="sm:hidden">
              <QuadrantesDesejos desejos={d.desejos} analises={plano.analises} classes={d.classes} onAbrir={setJanela} />
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-surface p-5 shadow-card md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold tracking-tight text-ink">Fila de desejos</h2>
                <p className="text-xs text-ink-muted">
                  Somam <b className="text-ink-soft">{formatCurrency(totalUnico)}</b> à vista
                  {totalMensal > 0 && <> e <b className="text-ink-soft">{formatCurrency(totalMensal)}</b> por mês</>}
                  {mesesParaTudo !== null && mesesParaTudo > 0 && <> · tudo pronto em ~{mesesParaTudo} meses com a sobra de hoje</>}
                </p>
              </div>
              <div className="flex rounded-xl border border-line bg-surface-2/60 p-0.5 text-xs font-semibold">
                {([['importancia', 'Mais importante'], ['custoBeneficio', 'Melhor custo-benefício']] as const).map(([v, r]) => (
                  <button key={v} onClick={() => d.definirOrdem(v)} className={`rounded-lg px-3 py-1.5 transition-colors ${d.ordem === v ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {plano.fila.map((item) => {
                const a = plano.analises.get(item.id)!
                const v = plano.veredito.get(item.id)!
                const cls = classeDe(item.classe, d.classes)
                const vt = textoVeredito(v)
                const ab = aberto === item.id
                // cofrinho: quanto do separado já está reservado para este desejo
                const unico = item.tipo === 'UNICO'
                const pctJuntado = pctCofrinho(item, v)
                return (
                  <div
                    key={item.id}
                    id={`desejo-${item.id}`}
                    className="relative scroll-mt-24 overflow-hidden rounded-2xl border bg-surface"
                    style={{ borderColor: `color-mix(in srgb, ${vt.cor} 30%, var(--color-line))` }}
                  >
                    <span aria-hidden className="absolute inset-y-0 left-0" style={{ width: `${pctJuntado}%`, background: `color-mix(in srgb, ${vt.cor} 13%, transparent)`, transition: 'width 500ms ease-out' }} />
                    <div className="relative">
                    <label className="absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center" title="Marcar para simular junto">
                      <input type="checkbox" checked={marcados.has(item.id)} onChange={() => alternarMarca(item.id)} aria-label={`Simular ${item.nome} junto com outros`} className="h-4 w-4 cursor-pointer accent-[var(--color-brand)]" />
                    </label>
                    <button type="button" onClick={() => setAberto(ab ? null : item.id)} aria-expanded={ab} className="relative grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 p-3.5 pl-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand sm:gap-4">
                      <span className="relative">
                        <FotoDesejo imagem={item.imagem} emoji={cls.emoji} tamanho={44} />
                        <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10.5px] font-extrabold tabular-nums text-surface">{v.posicao}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="line-clamp-2 text-[15px] font-bold leading-tight text-ink sm:truncate">{item.nome}</span>
                          {item.link && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-label="Tem link de compra" />}
                        </span>
                        <span className="mt-0.5 block truncate text-xs tabular-nums text-ink-muted">
                          {unico ? (
                            <>
                              <span className="hidden sm:inline">
                                <b className="text-ink-soft">{formatCurrency(v.juntado)}</b> de{' '}
                              </span>
                              {formatCurrency(item.valor)}
                            </>
                          ) : (
                            <>
                              <b className="text-ink-soft">{formatCurrency(item.valor)}</b>/mês
                            </>
                          )}
                          <span className="hidden sm:inline"> · {nf(a.diasSalario)} dias de salário</span>
                        </span>
                      </span>
                      <span className="max-w-[92px] text-right leading-tight sm:max-w-none">
                        <span className="block text-[22px] font-extrabold sm:text-[26px] leading-none tracking-tight tabular-nums" style={{ color: vt.cor }}>
                          {unico ? `${nf(pctJuntado, 0)}%` : v.tipo === 'mensalOk' ? <CheckCircle2 className="ml-auto h-7 w-7" aria-hidden /> : '—'}
                        </span>
                        <span className={`mt-1 block text-[11px] font-bold sm:whitespace-nowrap ${vt.classe}`}>{vt.texto}</span>
                        {v.atrasa && <span className="block text-[10.5px] font-semibold text-warning">passa da data</span>}
                        {v.parcelaCabe && v.tipo !== 'agora' && <span className="block text-[10.5px] font-medium text-ink-muted">ou parcelado já</span>}
                      </span>
                    </button>
                    </div>

                    {ab && (
                      <div className="relative border-t border-line-soft bg-surface px-4 py-3">
                        <DetalhesDesejo item={item} a={a} v={v} cls={cls} acoes={acoesDe(item)} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] text-ink-faint">
              O fundo de cada linha é o cofrinho: quanto do dinheiro separado já está reservado para aquele desejo. A fila anda em ordem: o separado e a sobra de cada mês pagam sempre o primeiro. Capricho só entra depois de tudo o que importa mais. Custo mensal reduz a sobra dos demais.
            </p>
          </section>

          <section className="rounded-3xl border border-line bg-surface shadow-card">
            <button onClick={() => setVerClasses((v) => !v)} aria-expanded={verClasses} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
              <span>
                <span className="block text-base font-bold tracking-tight text-ink">Classes e pesos</span>
                <span className="block text-xs text-ink-muted">Perfume não vale o mesmo que sapato de trabalho: ajuste aqui</span>
              </span>
              <ChevronDown className={`h-4 w-4 text-ink-faint transition-transform ${verClasses ? 'rotate-180' : ''}`} />
            </button>
            {verClasses && (
              <div className="border-t border-line-soft px-5 pb-5 pt-3">
                <div className="space-y-2">
                  {d.classes.map((c) => (
                    <div key={c.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 rounded-xl bg-surface-2/40 p-3 sm:grid-cols-[auto_1fr_auto_auto_auto_auto]">
                      <input
                        value={c.emoji}
                        onChange={(e) => d.ajustarClasse(c.id, { emoji: e.target.value.slice(0, 4) })}
                        aria-label={`Emoji de ${c.nome}`}
                        className="h-10 w-12 rounded-lg border border-line bg-surface text-center text-xl"
                      />
                      <span className="min-w-0">
                        <input
                          value={c.nome}
                          onChange={(e) => d.ajustarClasse(c.id, { nome: e.target.value })}
                          aria-label="Nome da classe"
                          className="w-full rounded-md bg-transparent px-1 text-sm font-bold text-ink outline-none focus:bg-surface"
                        />
                        <input
                          value={c.exemplo}
                          onChange={(e) => d.ajustarClasse(c.id, { exemplo: e.target.value })}
                          placeholder="exemplos (opcional)"
                          aria-label="Exemplos"
                          className="w-full rounded-md bg-transparent px-1 text-[11px] text-ink-faint outline-none focus:bg-surface"
                        />
                      </span>
                      <button
                        onClick={() => confirm(`Excluir a classe "${c.nome}"? Os desejos dela passam para "${(d.classes.find((x) => x.id !== c.id) ?? c).nome}".`) && d.excluirClasse(c.id)}
                        disabled={d.classes.length <= 1}
                        aria-label={`Excluir ${c.nome}`}
                        className="rounded-lg p-2 text-ink-faint hover:bg-expense-soft hover:text-expense disabled:opacity-30 sm:order-last"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <label className="col-span-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        peso ×
                        <input type="number" step="0.1" min="0.1" max="3" value={c.peso} onChange={(e) => d.ajustarClasse(c.id, { peso: Number(e.target.value) || 1 })} className="w-16 rounded-lg border border-line bg-surface px-2 py-1 text-sm font-bold tabular-nums text-ink" />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <input type="checkbox" checked={c.podeParcelar} onChange={(e) => d.ajustarClasse(c.id, { podeParcelar: e.target.checked })} /> pode parcelar
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <input type="checkbox" checked={c.soSobraLivre} onChange={(e) => d.ajustarClasse(c.id, { soSobraLivre: e.target.checked })} /> só sobra livre
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                  <button
                    onClick={() => d.criarClasse({ nome: 'Nova classe', emoji: '⭐', exemplo: '', peso: 1, podeParcelar: true, soSobraLivre: false })}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 font-semibold text-white hover:bg-brand-hover"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nova classe
                  </button>
                  <button onClick={d.restaurarClasses} className="font-semibold text-ink-soft hover:text-ink">Restaurar padrão</button>
                  <button onClick={() => confirm('Apagar todos os desejos deste navegador?') && d.limparTudo()} className="font-semibold text-expense">Apagar todos os desejos</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {d.realizados.length > 0 && <Conquistas d={d} />}

      {marcados.size > 0 && (
        <div className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-2xl shadow-black/30 md:bottom-6">
          <span className="text-sm font-semibold text-ink">
            {marcados.size} {marcados.size === 1 ? 'desejo marcado' : 'desejos marcados'}
            <span className="ml-1.5 font-normal text-ink-muted tabular-nums">
              · {formatCurrency(d.desejos.filter((x) => marcados.has(x.id) && x.tipo === 'UNICO').reduce((s, x) => s + x.valor, 0))}
            </span>
          </span>
          <button onClick={() => setCombo([...marcados])} className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
            <Layers className="h-4 w-4" /> Simular juntos
          </button>
          <button onClick={() => setMarcados(new Set())} aria-label="Limpar seleção" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {combo && (
        <ComboModal ids={combo} desejos={d.desejos} classes={d.classes} cap={cap} ordem={d.ordem} hoje={hoje} onClose={() => setCombo(null)} />
      )}

      {(() => {
        const item = janela ? d.desejos.find((x) => x.id === janela) : undefined
        if (!item) return null
        return (
          <DesejoModal
            item={item}
            a={plano.analises.get(item.id)!}
            v={plano.veredito.get(item.id)!}
            cls={classeDe(item.classe, d.classes)}
            acoes={acoesDe(item)}
            onClose={() => setJanela(null)}
          />
        )
      })()}

      {realizando && (
        <RealizarModal
          desejo={realizando}
          guardado={d.guardado}
          hoje={hoje}
          onClose={() => setRealizando(null)}
          onConfirmar={(dados) => {
            d.realizar(realizando.id, dados)
            setAberto(null)
            setMarcados((m) => {
              const n = new Set(m)
              n.delete(realizando.id)
              return n
            })
          }}
        />
      )}

      {(novo || editando) && (
        <DesejoFormModal
          desejo={editando ?? undefined}
          classes={d.classes}
          capacidade={cap}
          onClose={() => {
            setNovo(false)
            setEditando(null)
          }}
          onSalvar={d.salvar}
          onCriarClasse={d.criarClasse}
        />
      )}
    </>
  )
}

function Conquistas({ d }: { d: ReturnType<typeof useDesejos> }) {
  const lista = [...d.realizados].sort((a, b) => b.realizadoEm.localeCompare(a.realizadoEm))
  const total = lista.reduce((s, r) => s + r.valorPago, 0)
  const economia = lista.reduce((s, r) => s + Math.max(r.valor - r.valorPago, 0), 0)
  return (
    <section className="mt-4 rounded-3xl border border-line bg-surface p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-income-soft text-income">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold tracking-tight text-ink">Conquistas</h2>
            <p className="text-xs text-ink-muted">desejos que você já realizou</p>
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-income">{lista.length}</p>
            <p className="mt-1 text-[11px] text-ink-muted">{lista.length === 1 ? 'realizado' : 'realizados'}</p>
          </div>
          <div>
            <p className="text-[28px] font-extrabold leading-none tracking-tight tabular-nums text-ink">{formatCurrency(total)}</p>
            <p className="mt-1 text-[11px] text-ink-muted">{economia > 0 ? <>economizou <b className="text-income">{formatCurrency(economia)}</b></> : 'investidos em você'}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((r) => {
          const cls = classeDe(r.classe, d.classes)
          const dif = r.valor - r.valorPago
          return (
            <div key={r.id} className="group flex items-center gap-3 rounded-2xl bg-surface-2/50 p-3">
              <span className="relative">
                <FotoDesejo imagem={r.imagem} emoji={cls.emoji} tamanho={48} />
                <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-surface text-income" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{r.nome}</span>
                <span className="block text-xs tabular-nums text-ink-muted">
                  {formatDate(r.realizadoEm)} · <b className="text-ink-soft">{formatCurrency(r.valorPago)}</b>
                  {r.tipo === 'MENSAL' && '/mês'}
                </span>
                {Math.abs(dif) >= 0.01 && (
                  <span className={`block text-[11px] font-semibold tabular-nums ${dif > 0 ? 'text-income' : 'text-warning'}`}>
                    {dif > 0 ? `${formatCurrency(dif)} abaixo do previsto` : `${formatCurrency(-dif)} acima do previsto`}
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-1">
                <button
                  onClick={() => d.desfazerRealizado(r.id)}
                  title={r.descontado > 0 ? `Volta para a fila e devolve ${formatCurrency(r.descontado)} ao separado` : 'Volta para a fila'}
                  aria-label={`Desfazer ${r.nome}`}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-surface hover:text-ink"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => confirm(`Apagar "${r.nome}" das conquistas?`) && d.excluirRealizado(r.id)}
                  aria-label={`Apagar ${r.nome}`}
                  className="rounded-lg p-1.5 text-ink-faint hover:bg-expense-soft hover:text-expense"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
