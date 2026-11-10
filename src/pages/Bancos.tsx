import { useMemo, useState, type FormEvent } from 'react'
import { Landmark, RefreshCw, Plus, Check, X, Unplug, Link2, Tags, HandCoins, Sparkles } from 'lucide-react'
import { PluggyConnect } from 'react-pluggy-connect'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { SeletorCategoria } from '@/components/shared/SeletorCategoria'
import { SeletorSubcategoria } from '@/components/shared/SeletorSubcategoria'
import { usePluggy } from '@/hooks/usePluggy'
import { useDespesas } from '@/hooks/useDespesas'
import { useEntradas } from '@/hooks/useEntradas'
import { useContas } from '@/hooks/useContas'
import { pluggyRepository } from '@/repositories/pluggyRepository'
import { DivisaoTransacao } from '@/components/bancos/DivisaoTransacao'
import { TransacoesIgnoradas } from '@/components/bancos/TransacoesIgnoradas'
import { sugerirConciliacao, sugerirParcela, sugestaoUnica, type Sugestao, type SugestaoParcela } from '@/lib/conciliacao'
import { sugerirCategoria, type SugestaoCategoria } from '@/lib/sugestaoCategoria'
import { useDividas } from '@/hooks/useDividas'
import { useParcelas } from '@/hooks/useParcelas'
import {
  despesasDaDivisao,
  erroDaDivisao,
  juntarIds,
  novaParte,
  type ParteDivisao,
} from '@/lib/divisao'
import { hojeIso } from '@/lib/datas'
import { formatCurrency, formatDate, nomeBonito } from '@/lib/format'
import type { TransacaoPendente } from '@/types/finance'

interface Classificacao {
  categoria: string
  subcategoria: string
  conta: string
  dividir: boolean
  partes: ParteDivisao[]
  descricao?: string
}

const TIPOS_DE_CONTA = [
  { id: 'CREDIT', nome: 'Cartão de crédito' },
  { id: 'BANK', nome: 'Conta corrente' },
]

export function Bancos() {
  const {
    itens,
    pendentes,
    ignoradas,
    restaurar,
    vinculados,
    contasPluggy,
    carregando,
    sincronizando,
    erro,
    sincronizar,
    conectar,
    desconectar,
    marcar,
  } = usePluggy()
  const { despesas, criar: criarDespesa, excluir: excluirDespesa } = useDespesas()
  const { entradas, criar: criarEntrada, atualizar: atualizarEntrada } = useEntradas()
  const { contas } = useContas()
  const { dividas } = useDividas()
  const { parcelas, atualizar: atualizarParcela } = useParcelas()

  const [connectToken, setConnectToken] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const [classificacoes, setClassificacoes] = useState<Record<string, Classificacao>>({})
  const [codigoItem, setCodigoItem] = useState('')
  const [desde, setDesde] = useState(`${hojeIso().slice(0, 7)}-01`)
  const [tipos, setTipos] = useState<string[]>(['CREDIT'])
  // os seletores de categoria só existem na linha aberta: cada um busca a lista ao montar
  const [abertaId, setAbertaId] = useState<string | null>(null)
  const [conciliando, setConciliando] = useState(false)
  const [importandoId, setImportandoId] = useState<string | null>(null)

  // classificação provável pelo que você já lançou do mesmo estabelecimento
  const categoriasSugeridas = useMemo(() => {
    const mapa = new Map<string, SugestaoCategoria>()
    for (const t of pendentes) {
      const s = sugerirCategoria(t, despesas, entradas)
      if (s) mapa.set(t.id, s)
    }
    return mapa
  }, [pendentes, despesas, entradas])

  // débito que bate com parcela de dívida manual (carnê, boleto): pagar a parcela em um clique
  const parcelasPorTransacao = useMemo(() => {
    const mapa = new Map<string, SugestaoParcela[]>()
    for (const t of pendentes) mapa.set(t.id, sugerirParcela(t, parcelas, dividas))
    return mapa
  }, [pendentes, parcelas, dividas])

  async function pagarParcela(t: TransacaoPendente, s: SugestaoParcela) {
    setErroLocal(null)
    setImportandoId(t.id)
    let idCriada: string | null = null
    try {
      const { parcela, divida } = s
      const criada = await criarDespesa({
        data: t.data,
        descricao: `Parcela ${parcela.numeroParcela}/${divida.numParcelas} - ${divida.descricao}`,
        valor: t.valor,
        categoria: divida.categoria || 'DÍVIDAS/FIXOS',
        subcategoria: divida.subcategoria || 'Parcelas',
      })
      idCriada = criada.id
      const { id, ...dados } = parcela
      await atualizarParcela(id, { ...dados, status: 'PAGA', dataPagamento: t.data, valorPago: t.valor, idDespesa: criada.id })
      await marcar(t, 'IMPORTADA', criada.id)
      setMensagem(`Parcela ${parcela.numeroParcela}/${divida.numParcelas} de ${divida.descricao} paga.`)
    } catch (e) {
      // sem desfazer, a despesa ficaria solta e uma nova tentativa lançaria de novo
      if (idCriada) await excluirDespesa(idCriada).catch(() => {})
      setErroLocal(e instanceof Error ? e.message : 'Erro ao pagar a parcela')
    } finally {
      setImportandoId(null)
    }
  }

  const sugestoesPorTransacao = useMemo(() => {
    const mapa = new Map<string, Sugestao[]>()
    for (const t of pendentes) {
      const lancamentos = t.tipo === 'DESPESA' ? despesas : entradas
      mapa.set(t.id, sugerirConciliacao(t, lancamentos, vinculados))
    }
    return mapa
  }, [pendentes, despesas, entradas, vinculados])

  // cada lançamento só serve a uma transação: o que uma usa sai das opções da seguinte
  const paresUnicos = useMemo(() => {
    const usados = new Set(vinculados)
    const pares: { transacao: TransacaoPendente; sugestao: Sugestao }[] = []
    for (const t of pendentes) {
      const lancamentos = t.tipo === 'DESPESA' ? despesas : entradas
      const sugestao = sugestaoUnica(sugerirConciliacao(t, lancamentos, usados))
      if (sugestao) {
        pares.push({ transacao: t, sugestao })
        usados.add(sugestao.id)
      }
    }
    return pares
  }, [pendentes, despesas, entradas, vinculados])

  async function abrirWidget() {
    setErroLocal(null)
    try {
      setConnectToken(await pluggyRepository.obterConnectToken())
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : 'Erro ao abrir o Pluggy')
    }
  }

  async function adicionarConexao(itemId: string) {
    setErroLocal(null)
    try {
      await conectar(itemId)
      setCodigoItem('')
      setMensagem('Conexão salva. Escolha o período e clique em Sincronizar.')
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : 'Erro ao salvar a conexão')
    }
  }

  function handleAdicionarCodigo(e: FormEvent) {
    e.preventDefault()
    if (codigoItem.trim()) adicionarConexao(codigoItem.trim())
  }

  async function handleSincronizar() {
    setMensagem(null)
    const novas = await sincronizar({ desde, tipos })
    if (novas !== null) setMensagem(`${novas} nova(s) transação(ões) na fila.`)
  }

  function alternarTipo(id: string) {
    setTipos((atual) => (atual.includes(id) ? atual.filter((t) => t !== id) : [...atual, id]))
  }

  function classificacaoDe(id: string): Classificacao {
    return (
      classificacoes[id] ?? { categoria: '', subcategoria: '', conta: '', dividir: false, partes: [] }
    )
  }

  function alternarDivisao(t: TransacaoPendente, dividir: boolean) {
    const c = classificacaoDe(t.id)
    // o que já foi escolhido em "uma categoria" vira a primeira parte
    const partes = c.partes.length
      ? c.partes
      : [novaParte({ categoria: c.categoria, subcategoria: c.subcategoria }), novaParte()]
    atualizarClassificacao(t.id, { dividir, partes })
  }

  function atualizarClassificacao(id: string, parcial: Partial<Classificacao>) {
    setClassificacoes((atual) => ({ ...atual, [id]: { ...classificacaoDe(id), ...parcial } }))
  }

  async function importar(t: TransacaoPendente, pronta?: Classificacao) {
    const c = pronta ?? classificacaoDe(t.id)
    const descricao = c.descricao?.trim() || t.descricao
    setErroLocal(null)
    setImportandoId(t.id)
    try {
      const criado =
        t.tipo === 'DESPESA'
          ? await criarDespesa({
              data: t.data,
              descricao,
              valor: t.valor,
              categoria: c.categoria,
              subcategoria: c.subcategoria,
            })
          : await criarEntrada({
              data: t.data,
              descricao,
              valor: t.valor,
              categoria: c.categoria,
              contaDestino: c.conta,
              status: 'RECEBIDA',
            })
      await marcar(t, 'IMPORTADA', criado.id)
      setAbertaId(null)
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : 'Erro ao importar transação')
    } finally {
      setImportandoId(null)
    }
  }

  async function importarDividida(t: TransacaoPendente) {
    setErroLocal(null)
    setImportandoId(t.id)
    const criadas: string[] = []
    const c = classificacaoDe(t.id)
    try {
      for (const despesa of despesasDaDivisao(
        { ...t, descricao: c.descricao?.trim() || t.descricao },
        c.partes
      )) {
        const criada = await criarDespesa(despesa)
        criadas.push(criada.id)
      }
      await marcar(t, 'IMPORTADA', juntarIds(criadas))
      setAbertaId(null)
    } catch (e) {
      // sem desfazer, tentar de novo duplicaria as partes que já tinham sido criadas
      const desfeitas = await Promise.allSettled(criadas.map((id) => excluirDespesa(id)))
      const motivo = e instanceof Error ? e.message : 'Erro ao importar transação'
      setErroLocal(
        desfeitas.some((r) => r.status === 'rejected')
          ? `${motivo}. Algumas partes ficaram em Despesas: confira antes de tentar de novo.`
          : motivo
      )
    } finally {
      setImportandoId(null)
    }
  }

  async function aplicarVinculo(t: TransacaoPendente, s: Sugestao) {
    // entrada prevista que chegou no banco vira recebida, com a data e o valor reais
    const prevista = t.tipo === 'ENTRADA' && entradas.find((e) => e.id === s.id && e.status === 'PREVISTA')
    if (prevista) {
      const { id, ...dados } = prevista
      await atualizarEntrada(id, { ...dados, status: 'RECEBIDA', data: t.data, valor: t.valor })
    }
    await marcar(t, 'IMPORTADA', s.id)
  }

  async function vincular(t: TransacaoPendente, s: Sugestao) {
    setErroLocal(null)
    try {
      await aplicarVinculo(t, s)
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : 'Erro ao conciliar')
    }
  }

  async function conciliarUnicas() {
    if (!confirm(`Vincular ${paresUnicos.length} transação(ões) às despesas e entradas equivalentes?`))
      return
    setErroLocal(null)
    setConciliando(true)
    try {
      for (const { transacao, sugestao } of paresUnicos) {
        await aplicarVinculo(transacao, sugestao)
      }
      setMensagem(`${paresUnicos.length} transação(ões) conciliada(s).`)
    } catch (e) {
      setErroLocal(e instanceof Error ? e.message : 'Erro ao conciliar')
    } finally {
      setConciliando(false)
    }
  }

  function comoSugerida(s: SugestaoCategoria): Classificacao {
    return { categoria: s.categoria, subcategoria: s.subcategoria, conta: s.conta ?? '', dividir: false, partes: [] }
  }

  function abrirCategorizar(t: TransacaoPendente) {
    const s = categoriasSugeridas.get(t.id)
    // a sugestão já vem preenchida, mas o que você escolher à mão nunca é sobrescrito
    if (s && !classificacoes[t.id]) setClassificacoes((atual) => ({ ...atual, [t.id]: comoSugerida(s) }))
    setAbertaId(t.id)
  }

  function podeImportar(t: TransacaoPendente) {
    const c = classificacaoDe(t.id)
    return t.tipo === 'DESPESA' ? !!c.categoria && !!c.subcategoria : !!c.categoria && !!c.conta
  }

  return (
    <div>
      <PageHeader
        title="Bancos"
        subtitle="Conecte suas contas via Pluggy e concilie as transações com os seus lançamentos"
        action={
          <Button icon={<Plus className="h-4 w-4" />} onClick={abrirWidget}>
            Conectar banco
          </Button>
        }
      />

      {(erro || erroLocal) && <p className="text-sm text-expense mb-4">{erro ?? erroLocal}</p>}
      {mensagem && <p className="text-sm text-ink-muted mb-4">{mensagem}</p>}

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox={import.meta.env.DEV}
          onSuccess={async ({ item }) => {
            setConnectToken(null)
            await adicionarConexao(item.id)
          }}
          onError={(e) => {
            setConnectToken(null)
            setErroLocal(e.message)
          }}
          onClose={() => setConnectToken(null)}
        />
      )}

      <section className="mb-8">
        <h3 className="text-sm font-semibold text-ink-soft mb-2">Conexões</h3>
        {itens.length > 0 && (
          <ul className="space-y-2 mb-3">
            {itens.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
              >
                <span className="flex items-center gap-2 text-sm text-ink">
                  <Landmark className="h-4 w-4 text-ink-faint" />
                  {i.conector ?? 'Banco conectado'}
                </span>
                <button
                  aria-label={`Desconectar ${i.conector ?? 'banco'}`}
                  onClick={() =>
                    confirm(
                      'Desconectar este banco? As transações dele ainda na fila também saem. O que já foi importado continua.'
                    ) && desconectar(i)
                  }
                  className="text-ink-faint hover:text-expense"
                >
                  <Unplug className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdicionarCodigo} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={codigoItem}
            onChange={(e) => setCodigoItem(e.target.value)}
            aria-label="Código da conexão"
            placeholder="Código da conexão do MeuPluggy (aparece no Demo do dashboard do Pluggy)"
            className="flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm"
          />
          <Button type="submit" variant="secondary" disabled={!codigoItem.trim()}>
            Adicionar conexão
          </Button>
        </form>

        {contasPluggy.length > 0 && (
          <ul className="mt-3 text-sm text-ink-muted space-y-1">
            {contasPluggy.map((c) => (
              <li key={c.id}>
                {c.nome}: {formatCurrency(c.saldo)}
              </li>
            ))}
          </ul>
        )}
      </section>

      {itens.length > 0 && (
        <section className="mb-8 rounded-2xl border border-line bg-surface p-4">
          <h3 className="text-sm font-semibold text-ink-soft mb-3">Buscar transações</h3>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor="sincronizar-desde" className="block text-xs text-ink-muted mb-1">
                Desde
              </label>
              <input
                id="sincronizar-desde"
                type="date"
                value={desde}
                max={hojeIso()}
                onChange={(e) => setDesde(e.target.value)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3 pb-2">
              {TIPOS_DE_CONTA.map((tipo) => (
                <label key={tipo.id} className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={tipos.includes(tipo.id)}
                    onChange={() => alternarTipo(tipo.id)}
                    className="rounded border-line"
                  />
                  {tipo.nome}
                </label>
              ))}
            </div>
            <Button
              variant="secondary"
              icon={<RefreshCw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />}
              onClick={handleSincronizar}
              disabled={sincronizando || !desde || tipos.length === 0}
            >
              Sincronizar
            </Button>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Pagamento de fatura e transferência para você mesmo ficam de fora. Compras da fatura
            aberta entram; parcelas com data futura, não.
          </p>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-ink-soft">
          A conciliar {pendentes.length > 0 && `(${pendentes.length})`}
        </h3>
        {paresUnicos.length > 0 && (
          <Button
            variant="secondary"
            icon={<Link2 className="h-4 w-4" />}
            onClick={conciliarUnicas}
            disabled={conciliando}
          >
            {conciliando ? 'Conciliando...' : `Conciliar ${paresUnicos.length} com par único`}
          </Button>
        )}
      </div>

      {carregando ? (
        <p className="text-sm text-ink-faint">Carregando...</p>
      ) : pendentes.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title={itens.length ? 'Nada a conciliar' : 'Nenhum banco conectado'}
          description={
            itens.length
              ? 'Sincronize para buscar novas transações.'
              : 'Conecte um banco para importar suas transações.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {pendentes.map((t) => {
            const c = classificacaoDe(t.id)
            const sugestoes = sugestoesPorTransacao.get(t.id) ?? []
            const sugestoesParcela = parcelasPorTransacao.get(t.id) ?? []
            const sugCat = categoriasSugeridas.get(t.id)
            // o selo some assim que você troca a categoria
            const aindaSugerida = !!sugCat && c.categoria === sugCat.categoria && c.subcategoria === sugCat.subcategoria
            const aberta = abertaId === t.id
            const dividindo = c.dividir && t.tipo === 'DESPESA'
            const erroDivisao = aberta && dividindo ? erroDaDivisao(c.partes, t.valor) : null
            return (
              <li key={t.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{t.descricao}</p>
                    <p className="text-xs text-ink-faint">
                      {formatDate(t.data)}
                      {t.contaPluggy && ` · ${t.contaPluggy}`}
                      {t.parcelaTotal && t.parcelaTotal > 1
                        ? ` · parcela ${t.parcelaNumero}/${t.parcelaTotal}`
                        : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold ${t.tipo === 'DESPESA' ? 'text-expense' : 'text-income'}`}
                  >
                    {t.tipo === 'DESPESA' ? '-' : '+'}
                    {formatCurrency(t.valor)}
                  </span>
                </div>

                {sugestoesParcela.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {sugestoesParcela.map((s) => (
                      <li
                        key={s.parcela.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-income/30 bg-income-soft/60 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-2 text-xs text-ink-soft">
                          <HandCoins className="h-4 w-4 shrink-0 text-income" />
                          <span>
                            Parece a{' '}
                            <b className="font-semibold text-ink">
                              parcela {s.parcela.numeroParcela}/{s.divida.numParcelas} de {s.divida.descricao}
                            </b>{' '}
                            · vence {formatDate(s.parcela.dataVencimento)} · {formatCurrency(s.parcela.valorPrevisto)}
                            {s.diferenca > 0.009 && (
                              <span className="font-semibold text-expense"> · +{formatCurrency(s.diferenca)} de juros</span>
                            )}
                          </span>
                        </span>
                        <button
                          onClick={() => pagarParcela(t, s)}
                          disabled={importandoId === t.id}
                          className="flex items-center gap-1 rounded-lg bg-income px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60 dark:text-[#0b1a10]"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {importandoId === t.id ? 'Pagando...' : 'Pagar parcela'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {sugestoes.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {sugestoes.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-soft/60 px-3 py-2"
                      >
                        <span className="min-w-0 text-xs text-ink-soft">
                          {s.modo === 'compraInteira'
                            ? 'Compra lançada inteira: '
                            : 'Parece com: '}
                          <b className="font-semibold text-ink">{s.descricao}</b> ·{' '}
                          {formatDate(s.data)} · {formatCurrency(s.valor)}
                        </span>
                        <button
                          onClick={() => vincular(t, s)}
                          className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Vincular
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {sugCat && !aberta && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/25 bg-brand-soft/50 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2 text-xs text-ink-soft">
                      <Sparkles className="h-4 w-4 shrink-0 text-brand" />
                      <span>
                        Sugestão:{' '}
                        <b className="font-semibold text-ink">
                          {nomeBonito(sugCat.categoria)}
                          {sugCat.subcategoria && ` · ${sugCat.subcategoria}`}
                          {sugCat.conta && ` → ${sugCat.conta}`}
                        </b>{' '}
                        <span className="text-ink-muted">
                          · {sugCat.vezes === 1 ? 'igual a 1 lançamento seu' : `igual a ${sugCat.vezes} lançamentos seus`}
                          {sugCat.totalParecidos > sugCat.vezes && ` (de ${sugCat.totalParecidos} parecidos)`}
                        </span>
                      </span>
                    </span>
                    {sugCat.confianca === 'alta' && (
                      <button
                        onClick={() => importar(t, comoSugerida(sugCat))}
                        disabled={importandoId === t.id}
                        className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {importandoId === t.id ? 'Importando...' : 'Importar assim'}
                      </button>
                    )}
                  </div>
                )}

                {aberta && aindaSugerida && sugCat && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sugerida pelo seu histórico: igual a {sugCat.vezes} lançamento(s), como “{sugCat.exemplo.slice(0, 40)}”. Troque se não for isso.
                  </p>
                )}

                {aberta && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-ink-soft mb-1">
                      Descrição
                    </label>
                    <input
                      type="text"
                      value={c.descricao ?? t.descricao}
                      onChange={(e) => atualizarClassificacao(t.id, { descricao: e.target.value })}
                      placeholder="Ex.: Mercado do mês, Presente da mãe..."
                      className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm bg-surface"
                    />
                  </div>
                )}

                {aberta && t.tipo === 'DESPESA' && (
                  <div
                    role="tablist"
                    aria-label="Como lançar esta transação"
                    className="mt-3 inline-flex rounded-xl border border-line bg-surface-2/60 p-0.5"
                  >
                    {[
                      { dividir: false, rotulo: 'Uma categoria' },
                      { dividir: true, rotulo: 'Dividir' },
                    ].map((aba) => (
                      <button
                        key={aba.rotulo}
                        type="button"
                        role="tab"
                        aria-selected={c.dividir === aba.dividir}
                        onClick={() => alternarDivisao(t, aba.dividir)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          c.dividir === aba.dividir
                            ? 'bg-surface text-ink shadow-card'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {aba.rotulo}
                      </button>
                    ))}
                  </div>
                )}

                {aberta && c.dividir && t.tipo === 'DESPESA' && (
                  <DivisaoTransacao
                    total={t.valor}
                    partes={c.partes}
                    onChange={(partes) => atualizarClassificacao(t.id, { partes })}
                  />
                )}

                {aberta && !c.dividir && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <SeletorCategoria
                      value={c.categoria}
                      onChange={(categoria) =>
                        atualizarClassificacao(t.id, { categoria, subcategoria: '' })
                      }
                    />
                    {t.tipo === 'DESPESA' ? (
                      <SeletorSubcategoria
                        value={c.subcategoria}
                        onChange={(subcategoria) => atualizarClassificacao(t.id, { subcategoria })}
                        nomeCategoria={c.categoria}
                      />
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-ink-soft mb-1">
                          Conta de destino
                        </label>
                        <select
                          value={c.conta}
                          onChange={(e) => atualizarClassificacao(t.id, { conta: e.target.value })}
                          className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm bg-surface"
                        >
                          <option value="">Selecione...</option>
                          {contas
                            .filter((x) => x.ativa)
                            .map((x) => (
                              <option key={x.id} value={x.nome}>
                                {x.nome}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {erroDivisao && <p className="mt-2 text-xs text-ink-muted">{erroDivisao}</p>}

                <div className="flex flex-wrap gap-2 mt-3">
                  {aberta && dividindo ? (
                    <Button
                      icon={<Check className="h-4 w-4" />}
                      disabled={!!erroDivisao || importandoId === t.id}
                      onClick={() => importarDividida(t)}
                    >
                      {importandoId === t.id
                        ? 'Importando...'
                        : `Importar em ${c.partes.length} partes`}
                    </Button>
                  ) : aberta ? (
                    <Button
                      icon={<Check className="h-4 w-4" />}
                      disabled={!podeImportar(t) || importandoId === t.id}
                      onClick={() => importar(t)}
                    >
                      {importandoId === t.id ? 'Importando...' : 'Importar'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      icon={<Tags className="h-4 w-4" />}
                      onClick={() => abrirCategorizar(t)}
                    >
                      Categorizar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    icon={<X className="h-4 w-4" />}
                    onClick={() => marcar(t, 'IGNORADA')}
                  >
                    Ignorar
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <TransacoesIgnoradas ignoradas={ignoradas} onRestaurar={restaurar} />
    </div>
  )
}
