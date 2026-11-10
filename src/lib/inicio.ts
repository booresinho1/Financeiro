import { formatCurrency } from '@/lib/format'
import type { Vencimento } from '@/lib/dashboardResumo'
import type { Detalhe } from '@/lib/detalhes'
import type {
  BancoConectado,
  CartaoResumo,
  Despesa,
  Divida,
  Entrada,
  Orcamento,
  Parcela,
} from '@/types/finance'

const DIAS_DO_RITMO = 90
const DIAS_MINIMOS_DO_RITMO = 14
const MS_POR_DIA = 86_400_000

export function somarDias(dataIso: string, dias: number): string {
  return new Date(Date.parse(`${dataIso.slice(0, 10)}T00:00:00Z`) + dias * MS_POR_DIA)
    .toISOString()
    .slice(0, 10)
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / MS_POR_DIA)
}

function diasDoMes(periodo: string): number {
  const [ano, mes] = periodo.split('-').map(Number)
  return new Date(ano, mes, 0).getDate()
}

// ---------------------------------------------------------------------------
// 1. Caixa: o que há nas contas menos o que já está comprometido
// ---------------------------------------------------------------------------

export interface Caixa {
  origemSaldo: 'banco' | 'app'
  contas: { id: string; nome: string; saldo: number }[]
  saldo: number
  fatura: number
  faturaVencimento: string | null
  parcelas: Vencimento[]
  totalParcelas: number
  fixos: Vencimento[]
  totalFixos: number
  comprometido: number
  /** sem contar o que ainda vai entrar */
  livre: number
  previstas: Entrada[]
  totalPrevistas: number
  /** o que sobra no fim do mês: saldo + o que vai entrar − o que vai sair */
  sobra: number
  /** dias até o fim do mês, contando hoje */
  diasRestantes: number
  /** quanto dá para gastar por dia sem passar da sobra */
  porDia: number
  gastoDiario: number
  /** null quando ainda não há gasto suficiente pra estimar o ritmo */
  folegoDias: number | null
  acabaEm: string | null
  /** o primeiro dia em que falta dinheiro, se o gasto seguir no ritmo atual */
  faltaNoRitmo: PontoCaixa | null
  fimDoMes: string
  pontos: PontoCaixa[]
  /** o dia de menor saldo até o fim do mês */
  pior: PontoCaixa
}

export interface PontoCaixa {
  data: string
  dia: number
  saldo: number
  /** o mesmo saldo, descontando também o gasto do dia a dia até este dia */
  noRitmo: number
  /** valor com sinal: entrada positiva, saída negativa */
  eventos: { id: string; titulo: string; valor: number }[]
}

/** Saldo de cada dia, de hoje ao fim do mês: com o que já tem data e também no ritmo de gasto. */
function saldoDiaADia(
  saldo: number,
  eventos: { id: string; data: string; titulo: string; valor: number }[],
  gastoDiario: number,
  hoje: string,
  fimDoMes: string
): PontoCaixa[] {
  // o atrasado pesa hoje; o que vence depois do fim do mês, como a fatura, pesa no último dia
  const noPeriodo = (data: string) => (data < hoje ? hoje : data > fimDoMes ? fimDoMes : data)
  const pontos: PontoCaixa[] = []
  let corrente = saldo
  for (let data = hoje; data <= fimDoMes; data = somarDias(data, 1)) {
    const doDia = eventos
      .filter((e) => noPeriodo(e.data.slice(0, 10)) === data)
      .map(({ id, titulo, valor }) => ({ id, titulo, valor }))
    corrente += doDia.reduce((s, e) => s + e.valor, 0)
    pontos.push({
      data,
      dia: Number(data.slice(8, 10)),
      saldo: corrente,
      noRitmo: corrente - gastoDiario * (pontos.length + 1),
      eventos: doDia,
    })
  }
  return pontos
}

interface DadosCaixa {
  bancos: BancoConectado[]
  /** usado quando nenhum banco responde */
  saldoNoApp: { id: string; nome: string; saldo: number } | null
  cartoes: CartaoResumo[]
  vencimentosDoMes: Vencimento[]
  parcelas: Parcela[]
  dividas: Divida[]
  entradas: Entrada[]
  despesas: Despesa[]
  idsFixos: { parcelasIds: Set<string>; fixosIds: Set<string> }
}

/** Fatura em aberto mais o que faltou pagar da última fatura fechada. */
export function saldoDevedorDoCartao(c: CartaoResumo): number {
  const faltaDaUltima = c.ultimaFatura ? Math.max(c.ultimaFatura.total - c.ultimaFatura.pago, 0) : 0
  return Math.max(c.faturaAberta.total - c.faturaAberta.pago, 0) + faltaDaUltima
}

function gastoDiarioDoDiaADia(
  despesas: Despesa[],
  ids: DadosCaixa['idsFixos'],
  hoje: string
): number {
  const inicio = somarDias(hoje, -DIAS_DO_RITMO)
  const doDiaADia = despesas.filter((d) => {
    const data = d.data.slice(0, 10)
    return data >= inicio && data <= hoje && !ids.fixosIds.has(d.id) && !ids.parcelasIds.has(d.id)
  })
  if (!doDiaADia.length) return 0
  const primeira = doDiaADia.reduce(
    (m, d) => (d.data.slice(0, 10) < m ? d.data.slice(0, 10) : m),
    hoje
  )
  const dias = Math.max(diasEntre(primeira, hoje) + 1, DIAS_MINIMOS_DO_RITMO)
  return doDiaADia.reduce((s, d) => s + d.valor, 0) / dias
}

export function calcularCaixa(dados: DadosCaixa, hoje: string): Caixa {
  const mes = hoje.slice(0, 7)

  const contasDoBanco = dados.bancos
    .flatMap((b) => b.contas)
    .filter((c) => c.tipo !== 'CREDIT')
    .map((c) => ({ id: c.id, nome: c.nome, saldo: c.saldo }))
  const origemSaldo = contasDoBanco.length ? 'banco' : 'app'
  const contas = contasDoBanco.length
    ? contasDoBanco
    : dados.saldoNoApp
      ? [dados.saldoNoApp]
      : []
  const saldo = contas.reduce((s, c) => s + c.saldo, 0)

  // no saldo pelo app a compra no cartão já foi descontada ao ser lançada: somar a fatura contaria duas vezes
  const cartoes = origemSaldo === 'banco' ? dados.cartoes : []
  const fatura = cartoes.reduce((s, c) => s + saldoDevedorDoCartao(c), 0)
  const faturaVencimento =
    cartoes
      .map((c) => c.faturaAberta.vencimentoEstimado)
      .filter((d): d is string => !!d)
      .sort()[0] ?? null

  // parcela de mês passado continua devida, e o vencimentosDoMes só olha o mês corrente
  const parcelasAtrasadas: Vencimento[] = dados.parcelas
    .filter(
      (p) =>
        (p.status === 'PENDENTE' || p.status === 'ATRASADA') && p.dataVencimento.slice(0, 7) < mes
    )
    .map((p) => {
      const divida = dados.dividas.find((d) => d.id === p.idDivida)
      return {
        id: `pa-${p.id}`,
        data: p.dataVencimento,
        descricao: divida?.descricao ?? 'Parcela',
        detalhe: divida ? `Parcela ${p.numeroParcela}/${divida.numParcelas}` : 'Parcela',
        valor: p.valorPrevisto,
        vencido: true,
      }
    })
  const parcelas = [
    ...parcelasAtrasadas,
    ...dados.vencimentosDoMes.filter((v) => v.detalhe.startsWith('Parcela')),
  ].sort((a, b) => a.data.localeCompare(b.data))
  const fixos = dados.vencimentosDoMes.filter((v) => !v.detalhe.startsWith('Parcela'))
  const totalParcelas = parcelas.reduce((s, v) => s + v.valor, 0)
  const totalFixos = fixos.reduce((s, v) => s + v.valor, 0)

  const comprometido = fatura + totalParcelas + totalFixos
  const livre = saldo - comprometido

  const previstas = dados.entradas
    .filter((e) => e.status === 'PREVISTA' && e.data.slice(0, 7) <= mes)
    .sort((a, b) => a.data.localeCompare(b.data))

  const totalPrevistas = previstas.reduce((s, e) => s + e.valor, 0)
  const sobra = livre + totalPrevistas
  const totalDias = diasDoMes(mes)
  const diasRestantes = totalDias - Number(hoje.slice(8, 10)) + 1
  const fimDoMes = `${mes}-${String(totalDias).padStart(2, '0')}`

  const gastoDiario = gastoDiarioDoDiaADia(dados.despesas, dados.idsFixos, hoje)

  const pontos = saldoDiaADia(
    saldo,
    [
      ...previstas.map((e) => ({ id: e.id, data: e.data, titulo: e.descricao, valor: e.valor })),
      ...[...parcelas, ...fixos].map((v) => ({
        id: v.id,
        data: v.data,
        titulo: v.descricao,
        valor: -v.valor,
      })),
      ...(fatura > 0
        ? [
            {
              id: 'fatura',
              data: faturaVencimento ?? fimDoMes,
              titulo: 'Fatura do cartão',
              valor: -fatura,
            },
          ]
        : []),
    ],
    gastoDiario,
    hoje,
    fimDoMes
  )

  // o fôlego respeita a ordem das datas: uma fatura antes do salário pode zerar o dinheiro antes
  const faltaNoRitmo =
    gastoDiario > 0 ? (pontos.find((p) => p.noRitmo < 0) ?? null) : null
  const indiceDaFalta = faltaNoRitmo ? pontos.indexOf(faltaNoRitmo) : -1
  const folegoDias =
    gastoDiario <= 0
      ? null
      : indiceDaFalta >= 0
        ? indiceDaFalta
        : Math.max(Math.floor(sobra / gastoDiario), 0)
  const acabaEm =
    folegoDias === null
      ? null
      : indiceDaFalta >= 0
        ? somarDias(hoje, Math.max(indiceDaFalta - 1, 0))
        : somarDias(hoje, folegoDias)

  return {
    origemSaldo,
    contas,
    saldo,
    fatura,
    faturaVencimento,
    parcelas,
    totalParcelas,
    fixos,
    totalFixos,
    comprometido,
    livre,
    previstas,
    totalPrevistas,
    sobra,
    diasRestantes,
    porDia: Math.max(sobra, 0) / diasRestantes,
    gastoDiario,
    folegoDias,
    acabaEm,
    faltaNoRitmo,
    fimDoMes,
    pontos,
    pior: pontos.reduce((menor, p) => (p.saldo < menor.saldo ? p : menor), pontos[0]),
  }
}

// ---------------------------------------------------------------------------
// 2. Orçamento do mês: quanto ainda dá pra gastar em cada categoria
// ---------------------------------------------------------------------------

export type SituacaoOrcamento = 'folga' | 'atencao' | 'estourou'

export interface LinhaOrcamento {
  id: string
  categoria: string
  subcategoria?: string
  orcado: number
  gasto: number
  resta: number
  percentual: number
  /** quanto o mês fecha mantendo o ritmo; só existe no mês corrente */
  projecao: number | null
  situacao: SituacaoOrcamento
}

export interface ResumoOrcamentos {
  linhas: LinhaOrcamento[]
  orcado: number
  gasto: number
  /** soma do que ainda cabe nas categorias, sem deixar a estourada descontar das outras */
  resta: number
  /** fração do mês já passada: 1 em mês fechado, 0 em mês futuro */
  fracaoDoMes: number
  semOrcamento: { categoria: string; gasto: number }[]
}

const FRACAO_ATENCAO = 0.8

function situacaoDe(gasto: number, orcado: number, projecao: number | null): SituacaoOrcamento {
  if (gasto > orcado) return 'estourou'
  if (gasto >= orcado * FRACAO_ATENCAO || (projecao !== null && projecao > orcado)) return 'atencao'
  return 'folga'
}

export function resumirOrcamentos(
  orcamentos: Orcamento[],
  despesas: Despesa[],
  periodo: string,
  hoje: string
): ResumoOrcamentos {
  const doMes = despesas.filter((d) => d.data.slice(0, 7) === periodo)
  const totalDias = diasDoMes(periodo)
  const ehMesAtual = periodo === hoje.slice(0, 7)
  const diaAtual = Number(hoje.slice(8, 10))
  const fracaoDoMes = ehMesAtual ? diaAtual / totalDias : periodo < hoje.slice(0, 7) ? 1 : 0

  const linhas = orcamentos
    .filter((o) => o.valorOrcado > 0)
    .map((o): LinhaOrcamento => {
      const gasto = doMes
        .filter(
          (d) => d.categoria === o.categoria && (!o.subcategoria || d.subcategoria === o.subcategoria)
        )
        .reduce((s, d) => s + d.valor, 0)
      const projecao = ehMesAtual ? (gasto / diaAtual) * totalDias : null
      return {
        id: o.id,
        categoria: o.categoria,
        subcategoria: o.subcategoria,
        orcado: o.valorOrcado,
        gasto,
        resta: o.valorOrcado - gasto,
        percentual: (gasto / o.valorOrcado) * 100,
        projecao,
        situacao: situacaoDe(gasto, o.valorOrcado, projecao),
      }
    })
    .sort((a, b) => b.orcado - a.orcado || a.categoria.localeCompare(b.categoria))

  const categoriasComOrcamento = new Set(linhas.map((l) => l.categoria))
  const foraDoOrcamento = new Map<string, number>()
  for (const d of doMes) {
    if (categoriasComOrcamento.has(d.categoria)) continue
    foraDoOrcamento.set(d.categoria, (foraDoOrcamento.get(d.categoria) ?? 0) + d.valor)
  }

  return {
    linhas,
    orcado: linhas.reduce((s, l) => s + l.orcado, 0),
    gasto: linhas.reduce((s, l) => s + l.gasto, 0),
    resta: linhas.reduce((s, l) => s + Math.max(l.resta, 0), 0),
    fracaoDoMes,
    semOrcamento: [...foraDoOrcamento.entries()]
      .map(([categoria, gasto]) => ({ categoria, gasto }))
      .sort((a, b) => b.gasto - a.gasto),
  }
}

// ---------------------------------------------------------------------------
// 3. Modais do caixa
// ---------------------------------------------------------------------------

export function detalheSaldoContas(caixa: Caixa, hoje: string, cor: string): Detalhe {
  return {
    titulo: 'Saldo nas contas',
    subtitulo:
      caixa.origemSaldo === 'banco'
        ? 'Valor informado pelos bancos conectados'
        : 'Valor calculado pelos seus lançamentos',
    cor,
    estatisticas: [
      { rotulo: 'Total', valor: formatCurrency(caixa.saldo) },
      { rotulo: 'Contas', valor: String(caixa.contas.length) },
    ],
    itens: caixa.contas.map((c) => ({ id: c.id, data: hoje, titulo: c.nome, valor: c.saldo })),
    itensTitulo: 'Saldo de hoje em cada conta',
  }
}

export function detalheFatura(cartoes: CartaoResumo[], cor: string): Detalhe {
  const total = cartoes.reduce((s, c) => s + saldoDevedorDoCartao(c), 0)
  const lancado = cartoes.reduce((s, c) => s + c.faturaAberta.lancado, 0)
  const previstas = cartoes.reduce((s, c) => s + c.faturaAberta.parcelasPrevistas, 0)
  const pago = cartoes.reduce((s, c) => s + c.faturaAberta.pago, 0)
  const faltaDaUltima = total - (lancado + previstas - pago)
  const vencimento = cartoes
    .map((c) => c.faturaAberta.vencimentoEstimado)
    .filter((d): d is string => !!d)
    .sort()[0]
  const rotuloData = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

  return {
    titulo: 'Fatura a pagar',
    subtitulo: 'O vencimento é estimado até o banco fechar a fatura',
    cor,
    estatisticas: [
      { rotulo: 'A pagar', valor: formatCurrency(total) },
      { rotulo: 'Já lançado', valor: formatCurrency(lancado) },
      { rotulo: 'Parcelas que entram', valor: formatCurrency(previstas) },
      faltaDaUltima > 0.005
        ? { rotulo: 'Faltou da anterior', valor: formatCurrency(faltaDaUltima), tom: 'ruim' }
        : pago > 0
          ? { rotulo: 'Já pago antes', valor: formatCurrency(pago), tom: 'bom' }
          : { rotulo: 'Vence em', valor: vencimento ? rotuloData(vencimento) : '—' },
    ],
    itens: cartoes
      .flatMap((c) => c.faturaAberta.compras)
      .sort((a, b) => b.data.localeCompare(a.data))
      .map((c) => ({
        id: c.id,
        data: c.data,
        titulo: c.descricao,
        subtitulo: c.parcela ? `Parcela ${c.parcela}` : undefined,
        valor: c.valor,
      })),
    itensTitulo: 'Compras na fatura aberta',
  }
}

export function detalheEntradasPrevistas(caixa: Caixa, cor: string): Detalhe {
  return {
    titulo: 'Vai entrar',
    subtitulo: 'Entradas previstas até o fim do mês, ainda não recebidas',
    cor,
    estatisticas: [
      { rotulo: 'Total', valor: formatCurrency(caixa.totalPrevistas) },
      { rotulo: 'Entradas', valor: String(caixa.previstas.length) },
    ],
    itens: caixa.previstas.map((e) => ({
      id: e.id,
      data: e.data,
      titulo: e.descricao,
      subtitulo: e.contaDestino,
      valor: e.valor,
      tom: 'entrada' as const,
    })),
    itensTitulo: 'Por data',
  }
}

export function detalheSobraDoMes(caixa: Caixa, cor: string): Detalhe {
  return {
    titulo: caixa.sobra < 0 ? 'O que falta no mês' : 'O que sobra no mês',
    subtitulo: 'Tudo que entra e sai até o fim do mês, sem o gasto do dia a dia',
    cor,
    estatisticas: [
      {
        rotulo: caixa.sobra < 0 ? 'Falta' : 'Sobra',
        valor: formatCurrency(Math.abs(caixa.sobra)),
        tom: caixa.sobra < 0 ? 'ruim' : 'bom',
      },
      {
        rotulo: 'Dá para gastar',
        valor: `${formatCurrency(caixa.porDia)}/dia`,
        nota: `nos ${caixa.diasRestantes} dias que faltam`,
      },
      {
        rotulo: 'Gasto do dia a dia',
        valor: `${formatCurrency(caixa.gastoDiario)}/dia`,
        nota: `média de até ${DIAS_DO_RITMO} dias, sem fixos e parcelas`,
        tom: caixa.gastoDiario > caixa.porDia ? 'ruim' : undefined,
      },
      {
        rotulo: 'Fôlego',
        valor: caixa.folegoDias === null ? '—' : `${caixa.folegoDias} dia(s)`,
        tom: caixa.folegoDias === 0 ? 'ruim' : undefined,
      },
    ],
    divisao: [
      { nome: 'Tem hoje', valor: caixa.saldo },
      { nome: 'Vai entrar', valor: caixa.totalPrevistas },
      ...(caixa.origemSaldo === 'banco' ? [{ nome: 'Fatura do cartão', valor: -caixa.fatura }] : []),
      { nome: 'Parcelas de dívidas', valor: -caixa.totalParcelas },
      { nome: 'Custos fixos do mês', valor: -caixa.totalFixos },
    ],
    divisaoTitulo: 'A conta',
    divisaoTotalTitulo: caixa.sobra < 0 ? 'Falta' : 'Sobra',
    itens: [...caixa.parcelas, ...caixa.fixos]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((v) => ({
        id: v.id,
        data: v.data,
        titulo: v.descricao,
        subtitulo: v.vencido ? 'Vencido' : v.detalhe,
        valor: v.valor,
        tom: v.vencido ? ('alerta' as const) : undefined,
      })),
    itensTitulo: 'Parcelas e custos fixos, por data',
  }
}
