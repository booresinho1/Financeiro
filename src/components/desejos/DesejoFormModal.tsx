import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { analisar, normalizarLink, type Capacidade, type ClasseDesejo, type ClasseId, type Desejo } from '@/lib/desejos'
import { formatCurrency } from '@/lib/format'
import { sheetsService } from '@/services/sheetsService'
import { FotoDesejo } from './FotoDesejo'

type Dados = Omit<Desejo, 'id' | 'criadoEm'> & { id?: string }

const ESCALAS = [
  { chave: 'g', letra: 'G', nome: 'Gravidade', pergunta: 'Quanto isso muda a minha vida?', baixo: 'pouco', alto: 'muito' },
  { chave: 'u', letra: 'U', nome: 'Urgência', pergunta: 'Tem prazo? Dá para esperar?', baixo: 'pode esperar', alto: 'tem prazo' },
  { chave: 't', letra: 'T', nome: 'Tendência', pergunta: 'Se eu adiar, piora ou fica mais caro?', baixo: 'passa sozinho', alto: 'piora / encarece' },
] as const

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm'

function numero(v: string): number | undefined {
  const n = Number(v.replace(',', '.'))
  return v.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined
}

export function DesejoFormModal({
  desejo,
  classes,
  capacidade,
  onClose,
  onSalvar,
  onCriarClasse,
}: {
  desejo?: Desejo
  classes: ClasseDesejo[]
  capacidade: Capacidade
  onClose: () => void
  onSalvar: (d: Dados) => void
  onCriarClasse: (c: Omit<ClasseDesejo, 'id'>) => ClasseId
}) {
  const [criando, setCriando] = useState(false)
  const [novaNome, setNovaNome] = useState('')
  const [novaEmoji, setNovaEmoji] = useState('⭐')
  const [nome, setNome] = useState(desejo?.nome ?? '')
  const [classe, setClasse] = useState<ClasseId>(desejo?.classe ?? 'conforto')
  const [tipo, setTipo] = useState<Desejo['tipo']>(desejo?.tipo ?? 'UNICO')
  const [valor, setValor] = useState(desejo ? String(desejo.valor) : '')
  const [parcelasN, setParcelasN] = useState(desejo?.parcelas ? String(desejo.parcelas.n) : '')
  const [parcelaValor, setParcelaValor] = useState(desejo?.parcelas ? String(desejo.parcelas.valor).replace('.', ',') : '')
  // enquanto você não digita a parcela, ela é o preço dividido pelo número de parcelas
  const [parcelaManual, setParcelaManual] = useState(() => {
    const p = desejo?.parcelas
    return !!p && Math.abs(p.valor * p.n - desejo.valor) > 0.05 * p.n
  })
  const [vida, setVida] = useState(desejo?.vidaUtilMeses ? String(desejo.vidaUtilMeses) : '')
  const [alternativa, setAlternativa] = useState(desejo?.alternativa ? String(desejo.alternativa) : '')
  const [data, setData] = useState(desejo?.dataDesejada ?? '')
  const [link, setLink] = useState(desejo?.link ?? '')
  const [observacao, setObservacao] = useState(desejo?.observacao ?? '')
  const [imagem, setImagem] = useState(desejo?.imagem ?? '')
  const [colarImagem, setColarImagem] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [semFoto, setSemFoto] = useState(false)
  const [linkBuscado, setLinkBuscado] = useState(desejo?.link ?? '')

  async function buscarFoto(texto: string) {
    const url = normalizarLink(texto)
    if (!url || url === linkBuscado) return
    setLinkBuscado(url)
    setBuscando(true)
    setSemFoto(false)
    try {
      const r = await sheetsService.criar<{ imagem: string | null }>('foto-do-link', { url })
      if (r.imagem) setImagem(r.imagem)
      else setSemFoto(!imagem)
    } catch {
      setSemFoto(!imagem)
    } finally {
      setBuscando(false)
    }
  }
  const [nota, setNota] = useState({ g: desejo?.g ?? 3, u: desejo?.u ?? 3, t: desejo?.t ?? 3 })
  const [erro, setErro] = useState<string | null>(null)

  const cls = classes.find((c) => c.id === classe) ?? classes[0]
  const valorNum = numero(valor)
  const nParcelas = numero(parcelasN) ? Math.round(numero(parcelasN)!) : undefined
  const parcelaSugerida = nParcelas && valorNum ? Math.round((valorNum / nParcelas) * 100) / 100 : undefined
  const parcelaExibida = parcelaManual ? parcelaValor : parcelaSugerida !== undefined ? String(parcelaSugerida).replace('.', ',') : ''
  const parcelaNum = numero(parcelaExibida)
  const parcelas = nParcelas && parcelaNum ? { n: nParcelas, valor: parcelaNum } : undefined
  const jurosTotal = parcelas && valorNum ? parcelas.n * parcelas.valor - valorNum : 0

  const rascunho: Desejo | null = valorNum
    ? { id: 'previa', criadoEm: '', nome, classe, tipo, valor: valorNum, g: nota.g, u: nota.u, t: nota.t, parcelas, vidaUtilMeses: numero(vida), alternativa: numero(alternativa) }
    : null
  const previa = rascunho ? analisar(rascunho, classes, capacidade) : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return setErro('Dê um nome ao desejo.')
    if (!valorNum) return setErro('Informe o valor.')
    if (link.trim() && !normalizarLink(link)) return setErro('O link precisa ser um endereço de site, como loja.com.br/produto.')
    onSalvar({
      id: desejo?.id,
      nome: nome.trim(),
      classe,
      tipo,
      valor: valorNum,
      parcelas: tipo === 'UNICO' ? parcelas : undefined,
      vidaUtilMeses: tipo === 'UNICO' ? numero(vida) : undefined,
      alternativa: tipo === 'UNICO' ? numero(alternativa) : undefined,
      dataDesejada: data || undefined,
      link: normalizarLink(link),
      observacao: observacao.trim() || undefined,
      imagem: normalizarLink(imagem),
      g: nota.g,
      u: nota.u,
      t: nota.t,
    })
    onClose()
  }

  return (
    <Modal title={desejo ? 'Editar desejo' : 'Novo desejo'} subtitle="Classe, valores e as três notas do GUT" onClose={onClose} size="lg">
      <form onSubmit={enviar} className="space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">O que você quer?</label>
          <input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sapato social" className={CAMPO} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">Que tipo de desejo é?</label>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            {classes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setClasse(c.id)}
                className={`rounded-xl border px-2 py-2 text-center transition-colors ${
                  classe === c.id ? 'border-brand bg-brand-soft text-ink' : 'border-line text-ink-muted hover:bg-surface-2'
                }`}
              >
                <span className="block text-xl leading-none">{c.emoji}</span>
                <span className="mt-1 block text-[11px] font-semibold leading-tight">{c.nome}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCriando((v) => !v)}
              className={`rounded-xl border border-dashed px-2 py-2 text-center transition-colors ${criando ? 'border-brand bg-brand-soft text-ink' : 'border-line text-ink-muted hover:bg-surface-2'}`}
            >
              <span className="block text-xl leading-none">＋</span>
              <span className="mt-1 block text-[11px] font-semibold leading-tight">Nova classe</span>
            </button>
          </div>
          {criando && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-surface-2/50 p-2.5">
              <input value={novaEmoji} onChange={(e) => setNovaEmoji(e.target.value.slice(0, 4))} aria-label="Emoji" className="h-9 w-12 rounded-lg border border-line bg-surface text-center text-xl" />
              <input value={novaNome} onChange={(e) => setNovaNome(e.target.value)} placeholder="Nome da classe, ex.: Presentes" aria-label="Nome da classe" className="min-w-[160px] flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm" />
              <button
                type="button"
                disabled={!novaNome.trim()}
                onClick={() => {
                  setClasse(onCriarClasse({ nome: novaNome.trim(), emoji: novaEmoji || '⭐', exemplo: '', peso: 1, podeParcelar: true, soSobraLivre: false }))
                  setNovaNome('')
                  setCriando(false)
                }}
                className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
              >
                Criar e usar
              </button>
              <p className="w-full text-[11px] text-ink-faint">Peso 1 e pode parcelar. Você ajusta depois em "Classes e pesos".</p>
            </div>
          )}
          <p className="mt-1.5 text-xs text-ink-muted">
            {cls.exemplo} · peso <b className="text-ink-soft">×{cls.peso.toLocaleString('pt-BR')}</b>
            {cls.soSobraLivre && ' · só com sobra livre'}
            {!cls.podeParcelar && ' · sem parcelar'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">{tipo === 'MENSAL' ? 'Valor por mês (R$)' : 'Preço à vista (R$)'}</label>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className={CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">É uma compra única ou um custo mensal?</label>
            <div className="flex rounded-xl border border-line bg-surface-2/60 p-0.5 text-sm font-semibold">
              {([['UNICO', 'Compra única'], ['MENSAL', 'Todo mês']] as const).map(([v, r]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTipo(v)}
                  className={`flex-1 rounded-lg py-2 transition-colors ${tipo === v ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tipo === 'UNICO' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Parcelas</label>
              <input inputMode="numeric" value={parcelasN} onChange={(e) => setParcelasN(e.target.value)} placeholder="ex.: 10" className={CAMPO} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Valor da parcela</label>
              <input
                inputMode="decimal"
                value={parcelaExibida}
                onChange={(e) => {
                  setParcelaValor(e.target.value)
                  setParcelaManual(e.target.value.trim() !== '')
                }}
                placeholder="0,00"
                className={`${CAMPO} ${parcelaManual ? '' : 'text-ink-muted'}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Dura quantos meses?</label>
              <input inputMode="numeric" value={vida} onChange={(e) => setVida(e.target.value)} placeholder="ex.: 24" className={CAMPO} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Alternativa mais barata</label>
              <input inputMode="decimal" value={alternativa} onChange={(e) => setAlternativa(e.target.value)} placeholder="R$" className={CAMPO} />
            </div>
          </div>
        )}

        {tipo === 'UNICO' && parcelas && (
          <p className="-mt-2 text-xs text-ink-muted">
            {parcelaManual && jurosTotal > 0.5 ? (
              <>
                {parcelas.n}× {formatCurrency(parcelas.valor)} = <b className="text-expense">{formatCurrency(parcelas.n * parcelas.valor)}</b> no total, <b className="text-expense">+{formatCurrency(jurosTotal)}</b> de juros.
              </>
            ) : (
              <>Parcela automática: {formatCurrency(valorNum ?? 0)} ÷ {parcelas.n}, sem juros. Se a loja cobrar mais, digite o valor da parcela.</>
            )}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-ink-soft">
            Para quando? <span className="font-normal text-ink-faint">(opcional)</span>
          </label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={`${CAMPO} sm:max-w-[220px]`} />
        </div>

        <div className="space-y-3 rounded-2xl border border-line bg-surface-2/40 p-4">
          {ESCALAS.map((e) => (
            <div key={e.chave}>
              <p className="text-sm font-semibold text-ink">
                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md bg-ink text-[11px] font-bold text-surface">{e.letra}</span>
                {e.nome} <span className="font-normal text-ink-muted">· {e.pergunta}</span>
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="hidden w-24 shrink-0 text-[11px] text-ink-faint sm:block">{e.baixo}</span>
                <div className="grid flex-1 grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNota((x) => ({ ...x, [e.chave]: n }))}
                      className={`rounded-lg py-1.5 text-sm font-bold transition-colors ${
                        nota[e.chave] === n ? 'bg-brand text-white' : nota[e.chave] > n ? 'bg-brand-soft text-brand' : 'bg-surface text-ink-muted ring-1 ring-inset ring-line hover:bg-surface-2'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <span className="hidden w-24 shrink-0 text-right text-[11px] text-ink-faint sm:block">{e.alto}</span>
              </div>
            </div>
          ))}
        </div>

        {previa && (
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2/60 p-3 text-center sm:grid-cols-4">
            <Previa rotulo="Importância" valor={previa.importancia.toFixed(0)} nota={`GUT ${previa.gut} × ${previa.peso.toLocaleString('pt-BR')}`} />
            <Previa rotulo="Dias de salário" valor={previa.diasSalario.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} />
            <Previa rotulo="Custo por mês" valor={previa.custoPorMes ? formatCurrency(previa.custoPorMes) : '—'} nota={tipo === 'UNICO' ? 'valor ÷ vida útil' : undefined} />
            <Previa rotulo="Parcelar custa" valor={previa.juros ? `+${formatCurrency(previa.juros)}` : '—'} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">
              Link da compra <span className="font-normal text-ink-faint">(opcional)</span>
            </label>
            <div className="flex items-start gap-3">
              <FotoDesejo imagem={imagem || undefined} emoji={cls.emoji} tamanho={56} className="ring-1 ring-inset ring-line" />
              <div className="min-w-0 flex-1">
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onBlur={() => buscarFoto(link)}
                  placeholder="loja.com.br/produto"
                  inputMode="url"
                  className={CAMPO}
                />
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px] text-ink-faint">
                  {buscando ? (
                    <span>Buscando a foto…</span>
                  ) : semFoto ? (
                    <span>Esse site não mostrou a foto. Cole o link da imagem abaixo.</span>
                  ) : imagem ? (
                    <span>Foto puxada do link.</span>
                  ) : (
                    <span>Ao colar o link, a foto do produto vem sozinha.</span>
                  )}
                  {imagem && (
                    <button type="button" onClick={() => setImagem('')} className="font-semibold text-ink-soft hover:text-ink">
                      Tirar foto
                    </button>
                  )}
                  {!semFoto && (
                    <button type="button" onClick={() => setColarImagem((v) => !v)} className="font-semibold text-ink-soft hover:text-ink">
                      {colarImagem ? 'Fechar' : 'Usar outra imagem'}
                    </button>
                  )}
                </p>
                {(colarImagem || semFoto) && (
                  <input
                    value={imagem}
                    onChange={(e) => {
                      setImagem(e.target.value)
                      setSemFoto(false)
                    }}
                    placeholder="link da imagem (botão direito na foto > copiar endereço)"
                    inputMode="url"
                    aria-label="Link da imagem"
                    className={`${CAMPO} mt-1.5 py-2 text-xs`}
                  />
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-soft">
              Observação <span className="font-normal text-ink-faint">(opcional)</span>
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Modelo, cor, onde está mais barato, por que quer…"
              className={`${CAMPO} resize-y`}
            />
          </div>
        </div>

        {erro && <p className="text-sm text-expense">{erro}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-surface-2">
            Cancelar
          </button>
          <button type="submit" className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
            Salvar desejo
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Previa({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div>
      <p className="text-[11px] text-ink-muted">{rotulo}</p>
      <p className="text-lg font-extrabold tracking-tight text-ink tabular-nums">{valor}</p>
      {nota && <p className="text-[10px] text-ink-faint">{nota}</p>}
    </div>
  )
}
