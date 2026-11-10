import { useMemo, useState } from 'react'
import { vencimentosDoMes } from '@/lib/dashboardResumo'
import { hojeIso } from '@/lib/datas'
import { fluxoDoMes, mesesAte, montarDre, type NoFluxo } from '@/lib/dre'
import { detalheAPagar, detalheDespesas, detalheEntradas, detalheSobra, type Detalhe } from '@/lib/detalhes'
import { ondeAgir, orcamentoPorCategoria, sinaisDoMes } from '@/lib/acao'
import { useChartColors } from '@/lib/chartTheme'
import type { CustoFixo, Despesa, Divida, Entrada, Orcamento, PagamentoCustoFixo, Parcela } from '@/types/finance'

export interface DadosDre {
  despesas: Despesa[]
  entradas: Entrada[]
  custosFixos: CustoFixo[]
  pagamentos: PagamentoCustoFixo[]
  parcelas: Parcela[]
  dividas: Divida[]
  orcamentos: Orcamento[]
}

const categoriaDe = (d: { categoria: string }) => d.categoria || 'Sem categoria'
const subDe = (d: { subcategoria: string }) => d.subcategoria || 'Sem subcategoria'

/**
 * O DRE por competência de um mês (e dos 5 anteriores), com o fluxo, os sinais de orçamento e o
 * modal de lançamentos. Recebe os dados prontos: as telas que já os carregam não buscam de novo.
 */
export function useDreMes(dados: DadosDre, mes: string) {
  const { despesas, entradas, custosFixos, pagamentos, parcelas, dividas, orcamentos } = dados
  const cores = useChartColors()
  const hoje = hojeIso()
  const mesHoje = hoje.slice(0, 7)
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)

  const meses = useMemo(() => mesesAte(mes, 6), [mes])
  const atual = meses.length - 1

  const dre = useMemo(() => {
    const aLancar: Record<string, number> = {}
    for (const m of meses) {
      // fixos e parcelas de meses passados não pagos não se distinguem de "não lançado"
      if (m < mesHoje) continue
      aLancar[m] = vencimentosDoMes({ custosFixos, pagamentos, parcelas, dividas }, m, hoje).reduce((s, v) => s + v.valor, 0)
    }
    return montarDre(despesas, entradas, meses, aLancar)
  }, [despesas, entradas, meses, custosFixos, pagamentos, parcelas, dividas, hoje, mesHoje])

  const fluxo = useMemo(() => fluxoDoMes(dre, atual), [dre, atual])
  const comDados = useMemo(() => new Set([...despesas, ...entradas].map((x) => x.data.slice(0, 7))), [despesas, entradas])

  const sinais = useMemo(
    () => (mes > mesHoje ? new Map() : sinaisDoMes(dre, atual, orcamentoPorCategoria(orcamentos), mes === mesHoje)),
    [dre, atual, orcamentos, mes, mesHoje]
  )
  const prioridades = useMemo(() => ondeAgir(sinais), [sinais])

  const corDaCategoria = (nome: string) => {
    const k = dre.despesas.findIndex((l) => l.nome === nome)
    return k >= 0 && k < 5 ? cores.composicao[k] : cores.inkMuted
  }

  function abrirNo(no: NoFluxo, pai: NoFluxo | undefined, cor: string) {
    // o "% do que saiu" do modal compara com o que foi lançado, sem o que ainda vai ser
    const base = { cor, despesas, periodo: mes, totalSaiu: dre.totalDespesas[atual] - dre.aLancar[atual] }
    switch (no.tipo) {
      case 'categoria':
        return setDetalhe(
          detalheDespesas({
            ...base,
            titulo: no.nome,
            filtro: (d) => categoriaDe(d) === no.nome,
            agruparPor: subDe,
            divisaoTitulo: 'Por subcategoria',
          })
        )
      case 'sub': {
        if (!pai) return
        // "+N outras" junta as subcategorias que não ganharam cartão próprio
        const ehResto = no.id.endsWith(':+')
        const vistas = new Set(pai.filhos.filter((f) => !f.id.endsWith(':+')).map((f) => f.nome))
        return setDetalhe(
          detalheDespesas({
            ...base,
            titulo: ehResto ? `${pai.nome} · outras` : `${pai.nome} · ${no.nome}`,
            filtro: (d) => categoriaDe(d) === pai.nome && (ehResto ? !vistas.has(subDe(d)) : subDe(d) === no.nome),
            agruparPor: ehResto ? subDe : (d) => d.descricao,
            divisaoTitulo: ehResto ? 'Por subcategoria' : 'Por descrição',
          })
        )
      }
      case 'outras': {
        const destaque = new Set(fluxo.saidas.filter((s) => s.tipo === 'categoria').map((s) => s.nome))
        return setDetalhe(
          detalheDespesas({
            ...base,
            titulo: 'Outras categorias',
            filtro: (d) => !destaque.has(categoriaDe(d)),
            agruparPor: categoriaDe,
            divisaoTitulo: 'Por categoria',
          })
        )
      }
      case 'receita':
        return setDetalhe({
          ...detalheEntradas(entradas.filter((e) => categoriaDe(e) === no.nome), mes, cor),
          titulo: no.nome,
        })
      case 'aLancar':
        return setDetalhe(detalheAPagar(vencimentosDoMes({ custosFixos, pagamentos, parcelas, dividas }, mes, hoje), cor))
      case 'sobra':
      case 'faltou':
        return setDetalhe(detalheSobra(entradas, despesas, mes, cor))
    }
  }

  return {
    dre,
    meses,
    atual,
    fluxo,
    comDados,
    sinais,
    prioridades,
    corDaCategoria,
    abrirNo,
    detalhe,
    fecharDetalhe: () => setDetalhe(null),
    entrou: dre.totalReceitas[atual],
    saiu: dre.totalDespesas[atual],
    resultado: dre.resultado[atual],
    temAlancar: dre.aLancar.some((v) => v > 0),
    mesHoje,
    hoje,
  }
}

export type DreMes = ReturnType<typeof useDreMes>
