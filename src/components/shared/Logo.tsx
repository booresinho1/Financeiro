import { useId } from 'react'

/** Mesmo desenho de public/favicon.svg: se mudar um, mude o outro e gere os ícones de novo. */
export function Logo({ tamanho = 36, className = '' }: { tamanho?: number; className?: string }) {
  const fundo = `logo-${useId().replace(/:/g, '')}`
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Financeiro"
      className={className}
    >
      <defs>
        <linearGradient id={fundo} x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c6dff" />
          <stop offset="1" stopColor="#3f2fd6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${fundo})`} />
      <rect x="19" y="14" width="10" height="36" rx="5" fill="#fff" />
      <rect x="19" y="14" width="29" height="10" rx="5" fill="#c8f560" />
      <rect x="24" y="29" width="16" height="9" rx="4.5" fill="#fff" />
    </svg>
  )
}
