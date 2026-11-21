import { somarMeses } from '@/lib/datas'

export type ClasseId = string

export interface ClasseDesejo {
  id: ClasseId
  nome: string
  emoji: string
  exemplo: string
  /** multiplica a nota de importância */
  peso: number
  podeParcelar: boolean
  /** só entra na fila depois de tudo o que importa mais: nunca com dinheiro "emprestado" da prioridade */
  soSobraLivre: boolean
}

export const CLASSES_PADRAO: ClasseDesejo[] = [
  { id: 'essencial', nome: 'Essencial / trabalho', emoji: '🧰', exemplo: 'sapato social, roupa de trabalho, saúde', peso: 1.5, podeParcelar: true, soSobraLivre: false },
  { id: 'investimento', nome: 'Investimento em mim', emoji: '📈', exemplo: 'curso, notebook de trabalho', peso: 1.3, podeParcelar: true, soSobraLivre: false },
  { id: 'conforto', nome: 'Conforto / casa', emoji: '🛋️', exemplo: 'cadeira, enxoval, eletrodoméstico', peso: 1, podeParcelar: true, soSobraLivre: false },
  { id: 'experiencia', nome: 'Experiência', emoji: '✈️', exemplo: 'viagem, show, jantar especial', peso: 0.9, podeParcelar: false, soSobraLivre: false },
  { id: 'capricho', nome: 'Capricho', emoji: '💎', exemplo: 'perfume, gadget, extra', peso: 0.6, podeParcelar: false, soSobraLivre: true },
]

export interface Desejo {
  id: string
  nome: string
  classe: ClasseId
  /** preço à vista; no tipo MENSAL, o valor de cada mês */
  valor: number
  tipo: 'UNICO' | 'MENSAL'
  parcelas?: { n: number; valor: number }
  /** quantos meses vai durar ou ser usado */
  vidaUtilMeses?: number
  g: number
  u: number
  t: number
  /** YYYY-MM-DD */
  dataDesejada?: string
  /** preço da alternativa mais barata */
  alternativa?: number
  /** onde comprar */
  link?: string
  observacao?: string
  /** foto do produto (vinda do link ou colada) */
  imagem?: string
  /** dinheiro que você já guardou só para este desejo (fora do separado livre) */
  reservado?: number
  criadoEm: string
}

/** Desejo que você já realizou: sai da fila e vira conquista. */
export interface Realizado extends Desejo {
  /** YYYY-MM-DD */
  realizadoEm: string
  valorPago: number
  /** quanto saiu do dinheiro separado (volta se desfizer) */
  descontado: number
}

export interface Capacidade {
  receitaMensal: number
  /** o que sobra por mês em média, já depois de tudo o que você paga */
  sobraMensal: number
  /** dinheiro separado para desejos, disponível hoje */
  guardado: number
}

export type Ordem = 'importancia' | 'custoBeneficio'

export interface Analise {
  gut: number
  /** 0 a 100, já com o peso da classe (pode passar de 100 em classe com peso > 1) */
  importancia: number
  peso: number
  diasSalario: number
  pctSobra: number | null
  custoPorMes: number | null
  parcelaMensal: number | null
  /** quanto o parcelamento custa a mais que o à vista */
  juros: number | null
  economiaAlternativa: number | null
  /** importância por dia de salário */
  custoBeneficio: number
}

export type TipoVeredito = 'agora' | 'mes' | 'mensalOk' | 'nao'

export interface Veredito {
  tipo: TipoVeredito
  /** YYYY-MM, quando o dinheiro à vista fica pronto */
  mes?: string
  /** a parcela cabe na sobra mensal */
  parcelaCabe: boolean
  /** passa da data que você queria */
  atrasa: boolean
  /** quanto precisaria sobrar a mais por mês para caber em 12 meses */
  cortePorMes?: number
  posicao: number
  /** quanto do dinheiro separado já está reservado para este desejo (o cofrinho) */
  juntado: number
}

export const MAX_MESES = 36
const GUT_MAX = 125

/** Só aceita endereço web: "loja.com/x" vira https; qualquer outra coisa (como javascript:) é descartada. */
export function normalizarLink(texto: string): string | undefined {
  const t = texto.trim()
  if (!t) return undefined
  if (/^https?:\/\//i.test(t)) return t
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return undefined
  return /\./.test(t) ? `https://${t}` : undefined
}

export const reservadoDe = (d: Desejo) => (d.tipo === 'UNICO' ? Math.max(d.reservado ?? 0, 0) : 0)
/** O que ainda falta para comprar à vista, descontado o que você guardou só para ele. */
export const faltaPagar = (d: Desejo) => Math.max(d.valor - reservadoDe(d), 0)

export function classeDe(id: ClasseId, classes: ClasseDesejo[]): ClasseDesejo {
  return classes.find((c) => c.id === id) ?? classes[0] ?? CLASSES_PADRAO[2]
}

export type Quadrante = 'fazerJa' | 'planeje' | 'seSobrar' | 'penseBem'

/** Os cortes do mapa: metade da importância máxima e 1/4 do maior custo em dias de salário. */
export function limitesDoMapa(desejos: Desejo[], analises: Map<string, Analise>) {
  const maxDias = Math.max(...desejos.map((d) => analises.get(d.id)?.diasSalario ?? 0), 6)
  const maxImp = Math.max(...desejos.map((d) => analises.get(d.id)?.importancia ?? 0), 100)
  return { maxDias, maxImp, corteDias: maxDias * 0.25, corteImp: maxImp * 0.5 }
}

export function quadranteDe(a: Analise, l: ReturnType<typeof limitesDoMapa>): Quadrante {
  const importa = a.importancia >= l.corteImp
  const barato = a.diasSalario <= l.corteDias
  return importa ? (barato ? 'fazerJa' : 'planeje') : barato ? 'seSobrar' : 'penseBem'
}

export function analisar(d: Desejo, classes: ClasseDesejo[], cap: Capacidade): Analise {
  const peso = classeDe(d.classe, classes).peso
  const gut = d.g * d.u * d.t
  const importancia = (gut / GUT_MAX) * 100 * peso
  const salarioDia = cap.receitaMensal > 0 ? cap.receitaMensal / 30 : 0
  const diasSalario = salarioDia > 0 ? d.valor / salarioDia : 0
  const parcelaMensal = d.parcelas && d.parcelas.n > 0 ? d.parcelas.valor : null
  const totalParcelado = d.parcelas && d.parcelas.n > 0 ? d.parcelas.n * d.parcelas.valor : null
  return {
    gut,
    importancia,
    peso,
    diasSalario,
    pctSobra: cap.sobraMensal > 0 ? (d.valor / cap.sobraMensal) * 100 : null,
    custoPorMes: d.tipo === 'MENSAL' ? d.valor : d.vidaUtilMeses && d.vidaUtilMeses > 0 ? d.valor / d.vidaUtilMeses : null,
    parcelaMensal,
    juros: totalParcelado !== null && totalParcelado > d.valor ? totalParcelado - d.valor : null,
    economiaAlternativa: d.alternativa && d.alternativa < d.valor ? d.valor - d.alternativa : null,
    custoBeneficio: importancia / Math.max(diasSalario, 0.5),
  }
}

/**
 * A fila anda em ordem. O dinheiro guardado e a sobra de cada mês pagam sempre o primeiro da fila;
 * "capricho" (só sobra livre) vai para o fim, e o mensal reduz a sobra de todos os outros.
 */
export interface Compromisso {
  valor: number
  /** quantos meses seguidos reduz a sobra (a partir do mês que vem) */
  meses: number
}

export function planejar(
  desejos: Desejo[],
  classes: ClasseDesejo[],
  cap: Capacidade,
  ordem: Ordem,
  hoje: string,
  compromissos: Compromisso[] = []
): { fila: Desejo[]; veredito: Map<string, Veredito>; analises: Map<string, Analise> } {
  const analises = new Map(desejos.map((d) => [d.id, analisar(d, classes, cap)]))
  const nota = (d: Desejo) => {
    const a = analises.get(d.id)!
    return ordem === 'importancia' ? a.importancia : a.custoBeneficio
  }
  const caprichoDe = (d: Desejo) => classeDe(d.classe, classes).soSobraLivre
  const fila = [...desejos].sort((a, b) => Number(caprichoDe(a)) - Number(caprichoDe(b)) || nota(b) - nota(a))

  const mesAtual = hoje.slice(0, 7)
  const veredito = new Map<string, Veredito>()
  let sobra = cap.sobraMensal
  const unicos: Desejo[] = []

  fila.forEach((d, i) => {
    const a = analises.get(d.id)!
    const base = { posicao: i + 1, parcelaCabe: false, atrasa: false, juntado: 0 }
    if (d.tipo === 'MENSAL') {
      if (d.valor <= sobra) {
        sobra -= d.valor
        veredito.set(d.id, { ...base, tipo: 'mensalOk' })
      } else {
        veredito.set(d.id, { ...base, tipo: 'nao', cortePorMes: d.valor - Math.max(sobra, 0) })
      }
    } else {
      unicos.push(d)
      veredito.set(d.id, { ...base, tipo: 'nao', parcelaCabe: a.parcelaMensal !== null && classeDe(d.classe, classes).podeParcelar && a.parcelaMensal <= sobra })
    }
  })

  // simulação mês a mês com o que sobra depois dos mensais
  let pool = cap.guardado
  // o que você já guardou inteiro para o desejo não espera ninguém na fila: está pronto
  const fila2 = unicos.filter((d) => faltaPagar(d) > 0.005 && faltaPagar(d) <= cap.guardado + Math.max(sobra, 0) * MAX_MESES)
  for (const d of unicos.filter((x) => faltaPagar(x) <= 0.005)) {
    veredito.set(d.id, { ...veredito.get(d.id)!, tipo: 'agora', mes: mesAtual, atrasa: false })
  }
  // cofrinho: o que você guardou para o desejo, mais o separado livre enchendo os primeiros da fila, na ordem
  let resto = Math.max(cap.guardado, 0)
  for (const d of unicos) {
    const proprio = Math.min(reservadoDe(d), d.valor)
    const parte = fila2.includes(d) ? Math.min(faltaPagar(d), resto) : 0
    resto -= parte
    veredito.set(d.id, { ...veredito.get(d.id)!, juntado: proprio + parte })
  }
  for (let m = 0; m <= MAX_MESES && fila2.length; m++) {
    if (m > 0) pool += sobra - compromissos.filter((c) => m <= c.meses).reduce((t, c) => t + c.valor, 0)
    while (fila2.length && faltaPagar(fila2[0]) <= pool + 0.005) {
      const d = fila2.shift()!
      pool -= faltaPagar(d)
      const mes = somarMeses(`${mesAtual}-01`, m).slice(0, 7)
      const atual = veredito.get(d.id)!
      veredito.set(d.id, {
        ...atual,
        tipo: m === 0 ? 'agora' : 'mes',
        mes,
        atrasa: !!d.dataDesejada && mes > d.dataDesejada.slice(0, 7),
      })
    }
  }

  for (const d of unicos) {
    const v = veredito.get(d.id)!
    if (v.tipo === 'nao' && faltaPagar(d) > 0.005) {
      const falta = faltaPagar(d) - cap.guardado
      veredito.set(d.id, { ...v, cortePorMes: Math.max(falta / 12 - Math.max(sobra, 0), 0) })
    }
  }
  return { fila, veredito, analises }
}

// ---------------------------------------------------------------------------
// Simulador: "e se eu fizer isso?"
// ---------------------------------------------------------------------------

export type ModoSimulacao = 'avista' | 'parcelado' | 'mensal'

export const TETO_PARCELAS = 0.3

export interface Quadro {
  sobra: number
  poupancaPct: number | null
  guardado: number
  /** quantos meses de gasto o dinheiro separado cobre */
  folegoMeses: number | null
}

export interface MudancaNaFila {
  desejo: Desejo
  de: Veredito
  para: Veredito
  /** meses de atraso (positivo) ou adiantamento; null quando deixa de caber */
  meses: number | null
}

export interface Simulacao {
  modo: ModoSimulacao
  antes: Quadro
  depois: Quadro
  /** o que passa a sair todo mês e por quanto tempo */
  mensal: { valor: number; meses: number } | null
  parcelaPctReceita: number | null
  passaDoTeto: boolean
  custoExtra: number | null
  situacao: 'ok' | 'aperta' | 'nao'
  motivo: string
  mudancas: MudancaNaFila[]
}

function indiceMes(v: Veredito, hoje: string): number | null {
  if (v.tipo === 'agora' || v.tipo === 'mensalOk') return 0
  if (v.tipo !== 'mes' || !v.mes) return null
  const [a1, m1] = hoje.slice(0, 7).split('-').map(Number)
  const [a2, m2] = v.mes.split('-').map(Number)
  return (a2 - a1) * 12 + (m2 - m1)
}

function quadro(cap: Capacidade, sobra: number, guardado: number): Quadro {
  const gasto = cap.receitaMensal - cap.sobraMensal
  return {
    sobra,
    poupancaPct: cap.receitaMensal > 0 ? (sobra / cap.receitaMensal) * 100 : null,
    guardado,
    folegoMeses: gasto > 0 ? guardado / gasto : null,
  }
}

export function simular(
  d: Desejo,
  modo: ModoSimulacao,
  desejos: Desejo[],
  classes: ClasseDesejo[],
  cap: Capacidade,
  ordem: Ordem,
  hoje: string
): Simulacao {
  const parcela = d.parcelas && d.parcelas.n > 0 ? d.parcelas : null
  const mensal = modo === 'mensal' ? { valor: d.valor, meses: MAX_MESES } : modo === 'parcelado' && parcela ? { valor: parcela.valor, meses: parcela.n } : null
  const guardadoDepois = modo === 'avista' ? cap.guardado - d.valor : cap.guardado
  const sobraDepois = cap.sobraMensal - (mensal?.valor ?? 0)

  // a fila antes (com o desejo onde ele está) e depois (feito agora, fora da fila)
  const antes = planejar(desejos, classes, cap, ordem, hoje)
  const resto = desejos.filter((x) => x.id !== d.id)
  const depois = planejar(resto, classes, { ...cap, guardado: guardadoDepois }, ordem, hoje, mensal ? [mensal] : [])
  const mudancas: MudancaNaFila[] = []
  for (const x of resto) {
    const de = antes.veredito.get(x.id)!
    const para = depois.veredito.get(x.id)!
    const i1 = indiceMes(de, hoje)
    const i2 = indiceMes(para, hoje)
    if (i1 === i2 && de.tipo === para.tipo) continue
    mudancas.push({ desejo: x, de, para, meses: i1 !== null && i2 !== null ? i2 - i1 : null })
  }
  mudancas.sort((a, b) => (b.meses ?? 99) - (a.meses ?? 99))

  const parcelaPctReceita = modo === 'parcelado' && parcela && cap.receitaMensal > 0 ? (parcela.valor / cap.receitaMensal) * 100 : null
  const passaDoTeto = parcelaPctReceita !== null && parcelaPctReceita > TETO_PARCELAS * 100
  const poupDepois = cap.receitaMensal > 0 ? (sobraDepois / cap.receitaMensal) * 100 : null

  let situacao: Simulacao['situacao'] = 'ok'
  let motivo = 'Cabe sem apertar.'
  if (sobraDepois < 0) {
    situacao = 'nao'
    motivo = `A sobra mensal ficaria negativa em ${Math.abs(sobraDepois).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
  } else if (guardadoDepois < 0) {
    situacao = 'nao'
    motivo = `Você não tem esse valor separado: faltam ${Math.abs(guardadoDepois).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} hoje.`
  } else if (passaDoTeto || (poupDepois !== null && poupDepois < 10) || mudancas.some((m) => m.meses === null)) {
    situacao = 'aperta'
    motivo = passaDoTeto ? 'A parcela passa do teto de 30% da receita.' : poupDepois !== null && poupDepois < 10 ? 'A poupança cai abaixo de 10% da receita.' : 'Algum desejo deixa de caber.'
  }

  return {
    modo,
    antes: quadro(cap, cap.sobraMensal, cap.guardado),
    depois: quadro(cap, sobraDepois, guardadoDepois),
    mensal,
    parcelaPctReceita,
    passaDoTeto,
    custoExtra: modo === 'parcelado' && parcela ? Math.max(parcela.n * parcela.valor - d.valor, 0) : null,
    situacao,
    motivo,
    mudancas,
  }
}

// ---------------------------------------------------------------------------
// Combinação: vários desejos juntos, cada um à vista ou parcelado
// ---------------------------------------------------------------------------

export interface EscolhaCombo {
  id: string
  modo: ModoSimulacao
  /** parcelas, só no modo parcelado */
  n: number
}

export interface ItemCombo {
  desejo: Desejo
  modo: ModoSimulacao
  n: number
  parcela: number
  total: number
  custoExtra: number
  /** a classe não permite parcelar (a regra é sua, dá para ajustar) */
  foraDaRegra: boolean
}

export interface SimulacaoCombo {
  itens: ItemCombo[]
  antes: Quadro
  depois: Quadro
  pagoAgora: number
  /** quanto passa a sair por mês logo no mês que vem */
  mensalInicial: number
  linhaTempo: { mes: string; sobra: number }[]
  piorMes: { mes: string; sobra: number } | null
  parcelaPctReceita: number | null
  passaDoTeto: boolean
  custoExtra: number
  quitaEm: string | null
  situacao: 'ok' | 'aperta' | 'nao'
  motivo: string
  mudancas: MudancaNaFila[]
}

/** Parcela de n vezes: a salva no desejo se for a mesma quantidade, senão pela tabela Price com o juro informado. */
export function parcelaPara(d: Desejo, n: number, jurosMes: number): number {
  if (d.parcelas && d.parcelas.n === n) return d.parcelas.valor
  if (n <= 1) return d.valor
  if (jurosMes <= 0) return d.valor / n
  const i = jurosMes / 100
  return (d.valor * i) / (1 - Math.pow(1 + i, -n))
}

export const MESES_LINHA_TEMPO = 24

export function simularCombo(
  escolhas: EscolhaCombo[],
  desejos: Desejo[],
  classes: ClasseDesejo[],
  cap: Capacidade,
  ordem: Ordem,
  hoje: string,
  jurosMes: number
): SimulacaoCombo {
  const itens: ItemCombo[] = escolhas
    .map((e) => {
      const d = desejos.find((x) => x.id === e.id)
      if (!d) return null
      const modo: ModoSimulacao = d.tipo === 'MENSAL' ? 'mensal' : e.modo === 'mensal' ? 'avista' : e.modo
      const n = modo === 'parcelado' ? Math.max(Math.round(e.n), 1) : 1
      const parcela = modo === 'parcelado' ? parcelaPara(d, n, jurosMes) : d.valor
      const total = modo === 'parcelado' ? parcela * n : d.valor
      return {
        desejo: d,
        modo,
        n,
        parcela,
        total,
        custoExtra: modo === 'parcelado' ? Math.max(total - d.valor, 0) : 0,
        foraDaRegra: modo === 'parcelado' && !classeDe(d.classe, classes).podeParcelar,
      }
    })
    .filter((x): x is ItemCombo => x !== null)

  const compromissos: Compromisso[] = itens.flatMap((i) =>
    i.modo === 'parcelado' ? [{ valor: i.parcela, meses: i.n }] : i.modo === 'mensal' ? [{ valor: i.desejo.valor, meses: MAX_MESES }] : []
  )
  // à vista usa primeiro o que você guardou para o desejo; no parcelado, esse dinheiro volta para o separado livre
  const pagoAgora = itens.filter((i) => i.modo === 'avista').reduce((s, i) => s + faltaPagar(i.desejo), 0)
  const reservaLiberada = itens.filter((i) => i.modo === 'parcelado').reduce((s, i) => s + reservadoDe(i.desejo), 0)
  const guardadoDepois = cap.guardado - pagoAgora + reservaLiberada
  const ativos = (m: number) => compromissos.filter((c) => m <= c.meses).reduce((t, c) => t + c.valor, 0)
  const mensalInicial = ativos(1)
  const sobraDepois = cap.sobraMensal - mensalInicial

  const mesAtual = hoje.slice(0, 7)
  const linhaTempo = Array.from({ length: MESES_LINHA_TEMPO }, (_, k) => ({
    mes: somarMeses(`${mesAtual}-01`, k + 1).slice(0, 7),
    sobra: cap.sobraMensal - ativos(k + 1),
  }))
  const piorMes = linhaTempo.reduce<{ mes: string; sobra: number } | null>((p, x) => (!p || x.sobra < p.sobra ? x : p), null)
  const ultimo = compromissos.filter((c) => c.meses < MAX_MESES).reduce((m, c) => Math.max(m, c.meses), 0)

  const escolhidos = new Set(itens.map((i) => i.desejo.id))
  const resto = desejos.filter((x) => !escolhidos.has(x.id))
  const antesPlano = planejar(desejos, classes, cap, ordem, hoje)
  const depoisPlano = planejar(resto, classes, { ...cap, guardado: guardadoDepois }, ordem, hoje, compromissos)
  const mudancas: MudancaNaFila[] = []
  for (const x of resto) {
    const de = antesPlano.veredito.get(x.id)!
    const para = depoisPlano.veredito.get(x.id)!
    const i1 = indiceMes(de, hoje)
    const i2 = indiceMes(para, hoje)
    if (i1 === i2 && de.tipo === para.tipo) continue
    mudancas.push({ desejo: x, de, para, meses: i1 !== null && i2 !== null ? i2 - i1 : null })
  }
  mudancas.sort((a, b) => (b.meses ?? 99) - (a.meses ?? 99))

  const somaParcelas = itens.filter((i) => i.modo === 'parcelado').reduce((s, i) => s + i.parcela, 0)
  const parcelaPctReceita = somaParcelas > 0 && cap.receitaMensal > 0 ? (somaParcelas / cap.receitaMensal) * 100 : null
  const passaDoTeto = parcelaPctReceita !== null && parcelaPctReceita > TETO_PARCELAS * 100
  const poupDepois = cap.receitaMensal > 0 ? (sobraDepois / cap.receitaMensal) * 100 : null
  const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  let situacao: SimulacaoCombo['situacao'] = 'ok'
  let motivo = itens.length ? 'O conjunto cabe sem apertar.' : 'Marque desejos para simular.'
  if (piorMes && piorMes.sobra < 0 && itens.length) {
    situacao = 'nao'
    motivo = `Em ${piorMes.mes.slice(5)}/${piorMes.mes.slice(2, 4)} a sobra fica negativa em ${brl(Math.abs(piorMes.sobra))}.`
  } else if (guardadoDepois < 0) {
    situacao = 'nao'
    motivo = `Você não tem o dinheiro das compras à vista: faltam ${brl(Math.abs(guardadoDepois))} hoje.`
  } else if (passaDoTeto || (poupDepois !== null && poupDepois < 10 && itens.length) || mudancas.some((m) => m.meses === null)) {
    situacao = 'aperta'
    motivo = passaDoTeto ? 'As parcelas juntas passam do teto de 30% da receita.' : poupDepois !== null && poupDepois < 10 ? 'A poupança cai abaixo de 10% da receita.' : 'Algum outro desejo deixa de caber.'
  }

  return {
    itens,
    antes: quadro(cap, cap.sobraMensal, cap.guardado),
    depois: quadro(cap, sobraDepois, guardadoDepois),
    pagoAgora,
    mensalInicial,
    linhaTempo,
    piorMes,
    parcelaPctReceita,
    passaDoTeto,
    custoExtra: itens.reduce((s, i) => s + i.custoExtra, 0),
    quitaEm: ultimo > 0 ? somarMeses(`${mesAtual}-01`, ultimo).slice(0, 7) : null,
    situacao,
    motivo,
    mudancas,
  }
}
