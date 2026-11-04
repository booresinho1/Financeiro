import type { PluggyConta, PluggyFatura, PluggyTransacao } from './pluggyClient'
import { ehMovimentoInterno } from './pluggyTransacoes'

const FATURAS_NO_HISTORICO = 6

function somarMes(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(ano, mes - 1 + meses + 1, 0)).getUTCDate()
  return new Date(Date.UTC(ano, mes - 1 + meses, Math.min(dia, ultimoDia))).toISOString().slice(0, 10)
}

function nomeDaCompra(descricao: string): string {
  return descricao.replace(/\s*PARC\s*\d+\/\d+.*$/i, '').replace(/\s+/g, ' ').trim()
}

interface CicloEstimado {
  fechamento: string | null
  vencimento: string | null
}

/**
 * O banco só publica a fatura depois de fechada. As datas da aberta são estimadas: mesmo dia
 * da última fatura, avançando até o fechamento ainda não ter passado.
 */
function cicloAberto(ultima: PluggyFatura | undefined, hoje: string): CicloEstimado {
  if (!ultima) return { fechamento: null, vencimento: null }
  const baseVencimento = ultima.dueDate.slice(0, 10)
  const baseFechamento = ultima.billClosingDate?.slice(0, 10) ?? null
  let meses = 1
  // sem fechamento informado, usa o vencimento como referência de ciclo já encerrado
  while (somarMes(baseFechamento ?? baseVencimento, meses) < hoje) meses++
  return {
    fechamento: baseFechamento && somarMes(baseFechamento, meses),
    vencimento: somarMes(baseVencimento, meses),
  }
}

/** Parcelas em andamento: de cada compra vale a parcela mais recente que o banco já mostrou. */
function parcelasEmAndamento(transacoes: PluggyTransacao[]) {
  const porCompra = new Map<string, PluggyTransacao>()
  for (const t of transacoes) {
    const m = t.creditCardMetadata
    if (!m?.totalInstallments || m.totalInstallments < 2 || !m.installmentNumber) continue
    // o valor fica de fora da chave: a parcela varia centavos (60,00 e depois 59,99)
    const chave = `${nomeDaCompra(t.description)}|${m.purchaseDate?.slice(0, 10)}|${m.totalInstallments}`
    const atual = porCompra.get(chave)
    if (!atual || m.installmentNumber > (atual.creditCardMetadata?.installmentNumber ?? 0)) {
      porCompra.set(chave, t)
    }
  }

  return [...porCompra.values()]
    .map((t) => {
      const m = t.creditCardMetadata!
      const numero = m.installmentNumber!
      const total = m.totalInstallments!
      const restantes = total - numero
      return {
        id: t.id,
        descricao: nomeDaCompra(t.description),
        numero,
        total,
        valor: t.amount,
        restantes,
        valorRestante: restantes * t.amount,
        dataCompra: m.purchaseDate?.slice(0, 10) ?? null,
        // pendente já está na fatura aberta: a próxima parcela vem na seguinte
        primeiraFaturaRestante: t.status === 'PENDING' ? 1 : 0,
      }
    })
    .filter((p) => p.restantes > 0)
    .sort((a, b) => b.valorRestante - a.valorRestante)
}

export function montarCartao(
  conta: PluggyConta,
  faturas: PluggyFatura[],
  transacoes: PluggyTransacao[],
  hoje: string,
  banco: string
) {
  const ordenadas = [...faturas].sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  const ultima = ordenadas[0]
  const ciclo = cicloAberto(ultima, hoje)
  const parcelas = parcelasEmAndamento(transacoes)

  // índice 0 = fatura aberta; 1 em diante = próximas, só com o que já está comprado
  const previstoPorFatura = new Map<number, { valor: number; parcelas: number }>()
  for (const p of parcelas) {
    for (let i = 0; i < p.restantes; i++) {
      const indice = p.primeiraFaturaRestante + i
      const atual = previstoPorFatura.get(indice) ?? { valor: 0, parcelas: 0 }
      previstoPorFatura.set(indice, { valor: atual.valor + p.valor, parcelas: atual.parcelas + 1 })
    }
  }

  const compras = transacoes
    .filter(
      (t) => t.status === 'PENDING' && t.date.slice(0, 10) <= hoje && !ehMovimentoInterno(t)
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => ({
      id: t.id,
      data: t.date.slice(0, 10),
      descricao: t.description.replace(/\s+/g, ' ').trim(),
      valor: t.amount,
      categoria: t.category ?? null,
      finalCartao: t.creditCardMetadata?.cardNumber?.slice(-4) || null,
      parcela:
        (t.creditCardMetadata?.totalInstallments ?? 0) > 1
          ? `${t.creditCardMetadata?.installmentNumber}/${t.creditCardMetadata?.totalInstallments}`
          : null,
    }))
  const lancado = compras.reduce((s, c) => s + c.valor, 0)
  const parcelasPrevistas = previstoPorFatura.get(0)?.valor ?? 0

  // pagamento de verdade: o que entrou no cartão depois do fechamento da última fatura
  const fechamentoUltima = ultima?.billClosingDate?.slice(0, 10) ?? null
  const pagamentos = transacoes
    .filter(
      (t) =>
        ehMovimentoInterno(t) &&
        t.amount < 0 &&
        fechamentoUltima !== null &&
        t.date.slice(0, 10) >= fechamentoUltima
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  const encargosDe = (f: PluggyFatura) =>
    (f.financeCharges ?? []).reduce((s, c) => s + c.amount, 0)

  return {
    id: conta.id,
    banco,
    nome: conta.name,
    final: conta.number?.slice(-4) ?? null,
    bandeira: conta.creditData?.brand ?? null,
    limite: conta.creditData?.creditLimit ?? null,
    limiteDisponivel: conta.creditData?.availableCreditLimit ?? null,
    usado: Math.abs(conta.balance),
    faturaAberta: {
      fechamentoEstimado: ciclo.fechamento,
      vencimentoEstimado: ciclo.vencimento,
      lancado,
      parcelasPrevistas,
      total: lancado + parcelasPrevistas,
      compras,
    },
    ultimaFatura: ultima
      ? {
          id: ultima.id,
          fechamento: fechamentoUltima,
          vencimento: ultima.dueDate.slice(0, 10),
          total: ultima.totalAmount,
          minimo: ultima.minimumPaymentAmount ?? null,
          pago: pagamentos.reduce((s, t) => s + Math.abs(t.amount), 0),
          dataPagamento: pagamentos.at(-1)?.date.slice(0, 10) ?? null,
        }
      : null,
    faturas: ordenadas.slice(0, FATURAS_NO_HISTORICO).map((f) => ({
      id: f.id,
      fechamento: f.billClosingDate?.slice(0, 10) ?? null,
      vencimento: f.dueDate.slice(0, 10),
      total: f.totalAmount,
      encargos: encargosDe(f),
    })),
    parcelas,
    totalParcelasRestantes: parcelas.reduce((s, p) => s + p.valorRestante, 0),
    proximasFaturas: [...previstoPorFatura.entries()]
      .filter(([indice]) => indice > 0)
      .sort((a, b) => a[0] - b[0])
      .map(([indice, v]) => ({
        vencimentoEstimado: ciclo.vencimento && somarMes(ciclo.vencimento, indice),
        valor: v.valor,
        parcelas: v.parcelas,
      })),
  }
}

export type CartaoResumo = ReturnType<typeof montarCartao>
