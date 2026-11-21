import { useCallback, useEffect, useRef, useState } from 'react'
import { CLASSES_PADRAO, reservadoDe, type ClasseDesejo, type Desejo, type Ordem, type Realizado } from '@/lib/desejos'
import { sheetsService } from '@/services/sheetsService'

// Os desejos ficam no Supabase (tabelas desejos, desejos_classes e desejos_config).
// A tela muda na hora e a gravação vai em seguida; se falhar, aparece o aviso.
const CHAVE_LOCAL = 'desejos:v1' // onde o protótipo guardava: migra uma vez e apaga

interface Config {
  guardado: number
  ordem: Ordem
  /** sobra mensal digitada para simular; vazio = usa a média real do DRE */
  sobraManual: number | null
}

interface Estado extends Config {
  desejos: Desejo[]
  classes: ClasseDesejo[]
  realizados: Realizado[]
}

interface RespostaServidor {
  desejos: Desejo[]
  realizados: Realizado[]
  classes: ClasseDesejo[]
  config: Config | null
}

const VAZIO: Estado = { desejos: [], classes: CLASSES_PADRAO, guardado: 0, ordem: 'importancia', sobraManual: null, realizados: [] }

const api = (op: string, dados: Record<string, unknown>) => sheetsService.criar<{ ok: true }>('desejos', { op, ...dados })

function lerLocal(): Estado | null {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL)
    if (!bruto) return null
    const e = JSON.parse(bruto) as Partial<Estado>
    return {
      desejos: Array.isArray(e.desejos) ? e.desejos : [],
      classes: Array.isArray(e.classes) && e.classes.length ? e.classes : CLASSES_PADRAO,
      guardado: typeof e.guardado === 'number' ? e.guardado : 0,
      ordem: e.ordem === 'custoBeneficio' ? 'custoBeneficio' : 'importancia',
      sobraManual: typeof e.sobraManual === 'number' ? e.sobraManual : null,
      realizados: Array.isArray(e.realizados) ? e.realizados : [],
    }
  } catch {
    return null
  }
}

export function useDesejos() {
  const [estado, setEstadoBruto] = useState<Estado>(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  // cópia sempre atual do estado, para as ações calcularem o que gravar
  const atual = useRef<Estado>(VAZIO)
  const setEstado = useCallback((novo: Estado) => {
    atual.current = novo
    setEstadoBruto(novo)
  }, [])

  const gravar = useCallback((p: Promise<unknown>) => {
    p.then(() => setErro(null)).catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível salvar'))
  }, [])

  // campos digitados (separado, sobra simulada, nomes de classe) gravam depois de uma pausa
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const gravarDepois = useCallback(
    (chave: string, f: () => Promise<unknown>) => {
      clearTimeout(timers.current[chave])
      timers.current[chave] = setTimeout(() => gravar(f()), 700)
    },
    [gravar]
  )
  const salvarConfig = useCallback(() => {
    const { guardado, ordem, sobraManual } = atual.current
    gravarDepois('config', () => api('salvarConfig', { config: { guardado, ordem, sobraManual } }))
  }, [gravarDepois])
  const salvarClasses = useCallback(() => gravarDepois('classes', () => api('salvarClasses', { classes: atual.current.classes })), [gravarDepois])
  const salvarDesejos = useCallback((lista: (Desejo | Realizado)[]) => lista.length && gravar(api('salvarDesejos', { desejos: lista })), [gravar])

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const r = await sheetsService.listar<RespostaServidor>('desejos')
        let novo: Estado = {
          desejos: r.desejos,
          realizados: r.realizados,
          classes: r.classes.length ? r.classes : CLASSES_PADRAO,
          guardado: r.config?.guardado ?? 0,
          ordem: r.config?.ordem ?? 'importancia',
          sobraManual: r.config?.sobraManual ?? null,
        }
        // primeira vez no servidor: leva o que o protótipo tinha guardado neste navegador
        const local = lerLocal()
        const servidorVazio = !r.desejos.length && !r.realizados.length && !r.classes.length && !r.config
        if (local && servidorVazio) {
          await api('salvarClasses', { classes: local.classes })
          await api('salvarDesejos', { desejos: [...local.desejos, ...local.realizados] })
          await api('salvarConfig', { config: { guardado: local.guardado, ordem: local.ordem, sobraManual: local.sobraManual } })
          novo = local
        }
        if (local) localStorage.removeItem(CHAVE_LOCAL)
        if (vivo) setEstado(novo)
      } catch (e) {
        if (vivo) setErro(e instanceof Error ? e.message : 'Erro ao carregar desejos')
      } finally {
        if (vivo) setCarregando(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [setEstado])

  const salvar = useCallback(
    (d: Omit<Desejo, 'id' | 'criadoEm'> & { id?: string }) => {
      const e = atual.current
      const existente = d.id ? e.desejos.find((x) => x.id === d.id) : undefined
      const novo: Desejo = { ...d, id: d.id ?? crypto.randomUUID().split('-')[0], criadoEm: existente?.criadoEm ?? new Date().toISOString() }
      setEstado({ ...e, desejos: existente ? e.desejos.map((x) => (x.id === novo.id ? novo : x)) : [...e.desejos, novo] })
      salvarDesejos([novo])
    },
    [setEstado, salvarDesejos]
  )

  /** Dinheiro guardado só para este desejo; grava depois de uma pausa na digitação. */
  const reservar = useCallback(
    (id: string, valor: number) => {
      const e = atual.current
      const reservado = Math.max(valor, 0) || undefined
      setEstado({ ...e, desejos: e.desejos.map((x) => (x.id === id ? { ...x, reservado } : x)) })
      gravarDepois(`reserva-${id}`, async () => {
        const d = atual.current.desejos.find((x) => x.id === id)
        if (d) await api('salvarDesejos', { desejos: [d] })
      })
    },
    [setEstado, gravarDepois]
  )

  const excluir = useCallback(
    (id: string) => {
      const e = atual.current
      setEstado({ ...e, desejos: e.desejos.filter((d) => d.id !== id) })
      gravar(api('excluirDesejo', { id }))
    },
    [setEstado, gravar]
  )

  const definirGuardado = useCallback((guardado: number) => (setEstado({ ...atual.current, guardado }), salvarConfig()), [setEstado, salvarConfig])
  const definirSobraManual = useCallback((sobraManual: number | null) => (setEstado({ ...atual.current, sobraManual }), salvarConfig()), [setEstado, salvarConfig])
  const definirOrdem = useCallback((ordem: Ordem) => (setEstado({ ...atual.current, ordem }), salvarConfig()), [setEstado, salvarConfig])

  const ajustarClasse = useCallback(
    (id: ClasseDesejo['id'], parcial: Partial<ClasseDesejo>) => {
      const e = atual.current
      setEstado({ ...e, classes: e.classes.map((c) => (c.id === id ? { ...c, ...parcial } : c)) })
      salvarClasses()
    },
    [setEstado, salvarClasses]
  )
  const restaurarClasses = useCallback(() => {
    const e = atual.current
    // desejo de classe que deixou de existir vai para a primeira classe padrão
    const ids = new Set(CLASSES_PADRAO.map((c) => c.id))
    const movidos = e.desejos.filter((d) => !ids.has(d.classe)).map((d) => ({ ...d, classe: CLASSES_PADRAO[0].id }))
    setEstado({ ...e, classes: CLASSES_PADRAO, desejos: e.desejos.map((d) => movidos.find((m) => m.id === d.id) ?? d) })
    salvarClasses()
    salvarDesejos(movidos)
  }, [setEstado, salvarClasses, salvarDesejos])
  const criarClasse = useCallback(
    (c: Omit<ClasseDesejo, 'id'>) => {
      const id = `${c.nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'classe'}-${crypto.randomUUID().slice(0, 4)}`
      const e = atual.current
      setEstado({ ...e, classes: [...e.classes, { ...c, id }] })
      salvarClasses()
      return id
    },
    [setEstado, salvarClasses]
  )
  // os desejos da classe excluída passam para a primeira que sobrar
  const excluirClasse = useCallback(
    (id: ClasseDesejo['id']) => {
      const e = atual.current
      if (e.classes.length <= 1) return
      const restantes = e.classes.filter((c) => c.id !== id)
      const movidos = e.desejos.filter((d) => d.classe === id).map((d) => ({ ...d, classe: restantes[0].id }))
      setEstado({ ...e, classes: restantes, desejos: e.desejos.map((d) => movidos.find((m) => m.id === d.id) ?? d) })
      salvarDesejos(movidos)
      salvarClasses()
    },
    [setEstado, salvarClasses, salvarDesejos]
  )
  const carregarExemplos = useCallback(
    (exemplos: Desejo[]) => {
      const e = atual.current
      // ids novos: dá para carregar os exemplos mais de uma vez sem colidir
      const novos = exemplos.map((x) => ({ ...x, id: `${x.id}-${crypto.randomUUID().slice(0, 4)}` }))
      setEstado({ ...e, desejos: [...e.desejos, ...novos] })
      salvarDesejos(novos)
      salvarClasses()
    },
    [setEstado, salvarDesejos, salvarClasses]
  )
  const limparTudo = useCallback(() => {
    const e = atual.current
    setEstado({ ...e, desejos: [], realizados: [] })
    gravar(Promise.all([...e.desejos, ...e.realizados].map((d) => api('excluirDesejo', { id: d.id }))))
  }, [setEstado, gravar])

  /** Sai da fila e vira conquista; o que foi pago pode sair do dinheiro separado. */
  const realizar = useCallback(
    (id: string, dados: { valorPago: number; realizadoEm: string; descontar: boolean }) => {
      const e = atual.current
      const d = e.desejos.find((x) => x.id === id)
      if (!d) return
      // o que você guardou para ele paga primeiro; o resto pode sair do separado livre
      const doSeparado = Math.max(dados.valorPago - reservadoDe(d), 0)
      const descontado = dados.descontar ? Math.min(doSeparado, Math.max(e.guardado, 0)) : 0
      const r: Realizado = { ...d, realizadoEm: dados.realizadoEm, valorPago: dados.valorPago, descontado }
      setEstado({ ...e, desejos: e.desejos.filter((x) => x.id !== id), realizados: [r, ...e.realizados], guardado: e.guardado - descontado })
      salvarDesejos([r])
      if (descontado) salvarConfig()
    },
    [setEstado, salvarDesejos, salvarConfig]
  )
  /** Volta para a fila e devolve ao separado o que tinha saído dele. */
  const desfazerRealizado = useCallback(
    (id: string) => {
      const e = atual.current
      const r = e.realizados.find((x) => x.id === id)
      if (!r) return
      const { realizadoEm: _a, valorPago: _b, descontado, ...desejo } = r
      setEstado({ ...e, realizados: e.realizados.filter((x) => x.id !== id), desejos: [...e.desejos, desejo], guardado: e.guardado + descontado })
      salvarDesejos([desejo])
      if (descontado) salvarConfig()
    },
    [setEstado, salvarDesejos, salvarConfig]
  )
  const excluirRealizado = useCallback(
    (id: string) => {
      const e = atual.current
      setEstado({ ...e, realizados: e.realizados.filter((x) => x.id !== id) })
      gravar(api('excluirDesejo', { id }))
    },
    [setEstado, gravar]
  )

  return {
    ...estado,
    carregando,
    erro,
    salvar,
    reservar,
    excluir,
    definirGuardado,
    definirSobraManual,
    definirOrdem,
    ajustarClasse,
    restaurarClasses,
    criarClasse,
    excluirClasse,
    carregarExemplos,
    limparTudo,
    realizar,
    desfazerRealizado,
    excluirRealizado,
  }
}

export function desejosDeExemplo(hoje: string): Desejo[] {
  const em = (meses: number) => {
    const [a, m] = hoje.split('-').map(Number)
    return new Date(Date.UTC(a, m - 1 + meses, 15)).toISOString().slice(0, 10)
  }
  const base = { criadoEm: new Date().toISOString(), tipo: 'UNICO' as const }
  return [
    { ...base, id: 'ex1', nome: 'Sapato social', classe: 'essencial', valor: 380, g: 4, u: 4, t: 3, vidaUtilMeses: 24, parcelas: { n: 3, valor: 135 } },
    { ...base, id: 'ex2', nome: 'Roupas de trabalho', classe: 'essencial', valor: 600, g: 4, u: 3, t: 3, vidaUtilMeses: 18 },
    { ...base, id: 'ex3', nome: 'Notebook novo', classe: 'investimento', valor: 4200, g: 4, u: 2, t: 3, vidaUtilMeses: 48, parcelas: { n: 12, valor: 420 }, alternativa: 3500 },
    { ...base, id: 'ex4', nome: 'Curso de inglês', classe: 'investimento', tipo: 'MENSAL', valor: 300, g: 4, u: 3, t: 4 },
    { ...base, id: 'ex5', nome: 'Cadeira ergonômica', classe: 'conforto', valor: 1500, g: 3, u: 2, t: 3, vidaUtilMeses: 84, parcelas: { n: 10, valor: 160 } },
    { ...base, id: 'ex6', nome: 'Viagem para Jeri', classe: 'experiencia', valor: 3000, g: 3, u: 3, t: 2, dataDesejada: em(5) },
    { ...base, id: 'ex7', nome: 'Perfume importado', classe: 'capricho', valor: 450, g: 1, u: 1, t: 1, vidaUtilMeses: 4 },
  ]
}
