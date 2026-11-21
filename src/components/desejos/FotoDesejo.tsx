import { useState } from 'react'

/** Foto do produto; se não tiver ou não carregar, mostra o emoji da classe. */
export function FotoDesejo({ imagem, emoji, tamanho = 40, className = '' }: { imagem?: string; emoji: string; tamanho?: number; className?: string }) {
  const [falhou, setFalhou] = useState<string | null>(null)
  const mostrar = imagem && falhou !== imagem
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2 ${className}`}
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.5 }}
    >
      {mostrar ? (
        <img src={imagem} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(imagem)} className="h-full w-full bg-white object-contain" />
      ) : (
        <span aria-hidden className="leading-none">
          {emoji}
        </span>
      )}
    </span>
  )
}
