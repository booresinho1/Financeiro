import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SeletorMes } from '@/components/shared/SeletorMes'
import { ModalDetalhe } from '@/components/dashboard/ModalDetalhe'
import { OndeAgir } from '@/components/dre/OndeAgir'
import { IndicadoresDoMes } from '@/components/dre/IndicadoresDoMes'
import { useDespesas } from '@/hooks/useDespesas'
import { useEntradas } from '@/hooks/useEntradas'
import { useCustosFixos } from '@/hooks/useCustosFixos'
import { usePagamentosCustosFixos } from '@/hooks/usePagamentosCustosFixos'
import { useParcelas } from '@/hooks/useParcelas'
import { useDividas } from '@/hooks/useDividas'
import { useOrcamentos } from '@/hooks/useOrcamentos'
import { useDreMes } from '@/hooks/useDreMes'
import { hojeIso } from '@/lib/datas'
import { rotuloMes, type LinhaDre } from '@/lib/dre'
import { emojiDaCategoria } from '@/lib/emojiCategoria'
import { formatCurrency } from '@/lib/format'
import { nomeLegivel } from '@/lib/nomeLegivel'

function valor(v: number): string {
  return v === 0 ? '–' : formatCurrency(v)
}

const CELULA = 'px-1.5 py-1 text-right tabular-nums whitespace-nowrap'
const PRIMEIRA = 'sticky left-0 z-10 bg-surface px-3 py-2 text-left'

type Tom = 'receita' | 'despesa' | 'neutro'
const COR_TOM: Record<Tom, string> = {
  receita: 'var(--color-income)',
  despesa: 'var(--color-expense)',
  neutro: 'var(--color-ink-muted)',
}

function pctCurto(v: number): string {
  if (!Number.isFinite(v)) return ''
  const a = Math.abs(v)
  return `${a >= 10 ? Math.round(v) : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

/**
 * Célula = barrinha: o fundo enche até o peso do valor no maior mês da linha.
 * Embaixo vai a porcentagem da base do mês (receita; na subcategoria, a categoria).
 */
function Celula({
  v,
  max,
  base,
  tom,
  filho,
  constante,
}: {
  v: number
  max: number
  base: number
  tom: Tom
  filho?: boolean
  /** linha sem variação entre os meses: nenhum mês é destaque */
  constante?: boolean
}) {
  if (v === 0)
    return (
      <td className={CELULA}>
        <span className="inline-block min-w-[104px] px-2.5 text-ink-faint">–</span>
      </td>
    )
  const fatia = max > 0 ? v / max : 0
  const pico = fatia >= 0.999 && !constante
  return (
    <td className={CELULA}>
      <div className="ml-auto min-w-[104px] px-2.5 py-1">
        <span className={`block ${filho ? 'text-xs text-ink-soft' : `text-sm text-ink ${pico ? 'font-bold' : ''}`}`}>{valor(v)}</span>
        <span className="mt-1 flex items-center justify-end gap-1.5">
          <span aria-hidden className="h-1 w-12 overflow-hidden rounded-full bg-ink/[0.08] dark:bg-white/[0.08]">
            <span
              className="block h-full rounded-full"
              style={{ width: `${fatia * 100}%`, background: pico ? COR_TOM[tom] : `color-mix(in srgb, ${COR_TOM[tom]} 50%, transparent)` }}
            />
          </span>
          {base > 0 && (
            <span
              className="w-9 text-right text-[10.5px] font-semibold leading-none"
              style={{ color: pico ? COR_TOM[tom] : 'var(--color-ink-muted)' }}
            >
              {pctCurto((v / base) * 100)}
            </span>
          )}
        </span>
      </div>
    </td>
  )
}

function Linha({
  linha,
  tom,
  bases,
  baseTotal,
  aberta,
  onAlternar,
  filho = false,
  emoji = false,
}: {
  linha: LinhaDre
  tom: Tom
  /** base de cada mês para a porcentagem */
  bases: number[]
  baseTotal: number
  aberta?: boolean
  onAlternar?: () => void
  filho?: boolean
  emoji?: boolean
}) {
  const max = Math.max(...linha.porMes, 0)
  const positivos = linha.porMes.filter((v) => v > 0)
  const constante = positivos.length > 1 && Math.min(...positivos) >= max * 0.97
  return (
    <tr className="border-t border-line-soft transition-colors hover:bg-surface-2/40">
      <td className={`${PRIMEIRA} ${filho ? 'pl-10 text-xs text-ink-muted' : 'text-sm font-medium text-ink'}`}>
        {onAlternar ? (
          <button type="button" onClick={onAlternar} className="flex items-center gap-2 text-left">
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform ${aberta ? '' : '-rotate-90'}`}
            />
            {emoji && <span className="text-base leading-none">{emojiDaCategoria(linha.nome)}</span>}
            {nomeLegivel(linha.nome)}
          </button>
        ) : (
          <span className="flex items-center gap-2">
            {emoji && !filho && <span className="pl-[22px] text-base leading-none">{emojiDaCategoria(linha.nome)}</span>}
            <span className={!emoji && !filho ? 'pl-[22px]' : ''}>{nomeLegivel(linha.nome)}</span>
          </span>
        )}
      </td>
      {linha.porMes.map((v, i) => (
        <Celula key={i} v={v} max={max} base={bases[i]} tom={tom} filho={filho} constante={constante} />
      ))}
      <td className={`${CELULA} pr-4`}>
        <span className={`block font-bold ${filho ? 'text-xs text-ink-soft' : 'text-sm text-ink'}`}>{valor(linha.total)}</span>
        {baseTotal > 0 && linha.total > 0 && (
          <span className="block text-[10.5px] font-semibold text-ink-muted">{pctCurto((linha.total / baseTotal) * 100)}</span>
        )}
      </td>
    </tr>
  )
}

function Secao({ titulo, nota, colunas, cor }: { titulo: string; nota: string; colunas: number; cor: string }) {
  return (
    <tr>
      <td colSpan={colunas} className="px-3 pb-2 pt-5">
        <span className="flex items-center gap-2 text-[13px] font-bold text-ink">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} />
          {titulo}
          <span className="text-[11px] font-medium text-ink-muted">· {nota}</span>
        </span>
      </td>
    </tr>
  )
}

function Total({
  titulo,
  valores,
  tom,
  bases,
  rotuloPct,
  resultado = false,
}: {
  titulo: string
  valores: number[]
  tom: Tom
  /** sem base, a linha não mostra porcentagem */
  bases?: number[]
  rotuloPct?: string
  resultado?: boolean
}) {
  const soma = valores.reduce((t, v) => t + v, 0)
  const somaBase = bases?.reduce((t, v) => t + v, 0) ?? 0
  const corDe = (v: number) => (resultado ? (v < 0 ? 'var(--color-expense)' : 'var(--color-income)') : COR_TOM[tom])
  const texto = (v: number) => (resultado ? (v < 0 ? 'text-expense' : v > 0 ? 'text-income' : 'text-ink-faint') : 'text-ink')
  // em "Total de despesas" passar de 100% da receita é o alerta
  const corPct = (p: number) => (resultado ? (p < 0 ? 'text-expense' : 'text-income') : p > 100 ? 'text-expense' : 'text-ink-muted')
  return (
    <tr className={resultado ? 'border-t-2 border-line' : 'border-t border-line'}>
      <td className={`sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-bold text-ink ${resultado ? 'text-[15px]' : 'text-sm'}`}>
        {titulo}
        {rotuloPct && <span className="block text-[10.5px] font-medium text-ink-muted">{rotuloPct}</span>}
      </td>
      {valores.map((v, i) => {
        const p = bases && bases[i] > 0 ? (v / bases[i]) * 100 : null
        return (
          <td key={i} className={CELULA}>
            <div
              className="ml-auto min-w-[104px] rounded-lg px-2.5 py-1"
              style={v !== 0 ? { background: `color-mix(in srgb, ${corDe(v)} ${resultado ? 16 : 9}%, transparent)` } : undefined}
            >
              <span className={`block font-bold ${resultado ? 'text-[15px]' : 'text-sm'} ${v === 0 ? 'text-ink-faint' : texto(v)}`}>
                {valor(v)}
              </span>
              {p !== null && v !== 0 && <span className={`block text-[10.5px] font-bold leading-tight ${corPct(p)}`}>{pctCurto(p)}</span>}
            </div>
          </td>
        )
      })}
      <td className={`${CELULA} pr-4`}>
        <span className={`block font-extrabold ${resultado ? 'text-[15px]' : 'text-sm'} ${texto(soma)}`}>{valor(soma)}</span>
        {bases && somaBase > 0 && soma !== 0 && (
          <span className={`block text-[10.5px] font-bold ${corPct((soma / somaBase) * 100)}`}>{pctCurto((soma / somaBase) * 100)}</span>
        )}
      </td>
    </tr>
  )
}

export function Dre() {
  const { despesas } = useDespesas()
  const { entradas } = useEntradas()
  const { custosFixos } = useCustosFixos()
  const { pagamentos } = usePagamentosCustosFixos()
  const { parcelas } = useParcelas()
  const { dividas } = useDividas()
  const { orcamentos } = useOrcamentos()

  const [mes, setMes] = useState(hojeIso().slice(0, 7))
  const [abertas, setAbertas] = useState<Set<string>>(new Set())
  const d = useDreMes({ despesas, entradas, custosFixos, pagamentos, parcelas, dividas, orcamentos }, mes)
  const { dre, meses, atual, entrou, resultado, temAlancar, prioridades, corDaCategoria, abrirNo, comDados, mesHoje } = d

  function alternar(chave: string) {
    setAbertas((a) => {
      const n = new Set(a)
      if (!n.delete(chave)) n.add(chave)
      return n
    })
  }

  const totalReceitasJanela = dre.totalReceitas.reduce((t, v) => t + v, 0)

  function linhasComFilhos(linhas: LinhaDre[], prefixo: string, tom: Tom, emoji: boolean) {
    return linhas.flatMap((l) => {
      const chave = `${prefixo}:${l.nome}`
      const aberta = abertas.has(chave)
      return [
        <Linha
          key={chave}
          linha={l}
          tom={tom}
          bases={dre.totalReceitas}
          baseTotal={totalReceitasJanela}
          emoji={emoji}
          aberta={aberta}
          onAlternar={l.filhos && l.filhos.length > 1 ? () => alternar(chave) : undefined}
        />,
        ...(aberta ? (l.filhos ?? []).map((f) => <Linha key={`${chave}:${f.nome}`} linha={f} tom={tom} bases={l.porMes} baseTotal={l.total} filho />) : []),
      ]
    })
  }

  return (
    <>
      <div className="relative z-20 mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-ink">DRE</h1>
          <p className="mt-0.5 text-sm text-ink-muted">
            Demonstrativo por competência: cada valor entra no mês da compra ou da entrada, não no dia em que saiu do banco
          </p>
        </div>
        <SeletorMes valor={mes} onChange={setMes} comDados={comDados} hoje={mesHoje} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="text-[15px] font-bold tracking-tight text-ink">Demonstrativo dos últimos 6 meses</h3>
          <p className="text-[11px] text-ink-muted">A barrinha enche no mês mais pesado da linha; o número é a porcentagem</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="text-xs text-ink-muted">
                <th className="sticky left-0 z-10 bg-surface px-3 py-2.5 text-left font-medium" />
                {meses.map((m) => (
                  <th key={m} className={`${CELULA} font-medium ${m === mes ? 'font-bold text-brand' : ''}`}>
                    {rotuloMes(m)}
                  </th>
                ))}
                <th className={`${CELULA} font-medium`}>Total</th>
              </tr>
            </thead>
            <tbody>
              <Secao titulo="Receitas" nota="% da receita do mês" colunas={meses.length + 2} cor="var(--color-income)" />
              {dre.receitas.length === 0 && (
                <tr>
                  <td colSpan={meses.length + 2} className="px-3 py-3 text-sm text-ink-faint">
                    Nenhuma entrada nesse período.
                  </td>
                </tr>
              )}
              {linhasComFilhos(dre.receitas, 'r', 'receita', false)}
              <Total titulo="Total de receitas" valores={dre.totalReceitas} tom="receita" />

              <Secao titulo="Despesas por categoria" nota="% da receita do mês · nas subcategorias, % da categoria" colunas={meses.length + 2} cor="var(--color-expense)" />
              {dre.despesas.length === 0 && (
                <tr>
                  <td colSpan={meses.length + 2} className="px-3 py-3 text-sm text-ink-faint">
                    Nenhuma despesa nesse período.
                  </td>
                </tr>
              )}
              {linhasComFilhos(dre.despesas, 'd', 'despesa', true)}
              {temAlancar && (
                <Linha
                  linha={{
                    nome: 'Ainda a lançar (fixos e parcelas do mês)',
                    porMes: dre.aLancar,
                    total: dre.aLancar.reduce((t, v) => t + v, 0),
                  }}
                  tom="neutro"
                  bases={dre.totalReceitas}
                  baseTotal={totalReceitasJanela}
                />
              )}
              <Total titulo="Total de despesas" valores={dre.totalDespesas} tom="despesa" bases={dre.totalReceitas} rotuloPct="% da receita" />

              <Total titulo="Resultado" valores={dre.resultado} tom="neutro" bases={dre.totalReceitas} rotuloPct="margem" resultado />
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        Receitas incluem entradas previstas. A compra parcelada entra pela parcela lançada, não pelo valor
        total, até as Dívidas ganharem a data da compra.
      </p>

      {mes <= mesHoje && (
        <OndeAgir
          itens={prioridades}
          receitas={entrou}
          resultado={resultado}
          corDe={corDaCategoria}
          onAbrir={(nome) =>
            abrirNo({ id: `d:${nome}`, nome, valor: 0, tipo: 'categoria', filhos: [] }, undefined, corDaCategoria(nome))
          }
        />
      )}
      <IndicadoresDoMes dre={dre} i={atual} />

      {d.detalhe && <ModalDetalhe detalhe={d.detalhe} onClose={d.fecharDetalhe} />}
    </>
  )
}
