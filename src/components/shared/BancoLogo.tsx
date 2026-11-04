import { marcaDoBanco } from '@/lib/bancos'

interface BancoLogoProps {
  nomeConta: string
  tamanho?: number
}

export function BancoLogo({ nomeConta, tamanho = 40 }: BancoLogoProps) {
  const marca = marcaDoBanco(nomeConta)

  if (!marca) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-xl bg-brand-soft font-bold text-brand"
        style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }}
      >
        {nomeConta[0]?.toUpperCase()}
      </span>
    )
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl font-extrabold tracking-tight"
      style={{
        width: tamanho,
        height: tamanho,
        background: marca.fundo,
        color: marca.texto,
        fontSize: tamanho * (marca.minuscula ? 0.45 : 0.36),
      }}
      aria-hidden
    >
      {marca.sigla}
    </span>
  )
}
