import { useMemo, useRef, useState, type KeyboardEvent } from 'react'

interface ComboBoxProps {
  value: string
  onChange: (valor: string) => void
  opcoes: string[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function ComboBox({
  value,
  onChange,
  opcoes,
  placeholder,
  required,
  disabled,
  className = '',
}: ComboBoxProps) {
  const [aberto, setAberto] = useState(false)
  const [destaque, setDestaque] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const sugestoes = useMemo(() => {
    const termo = value.trim().toLowerCase()
    const filtradas = termo ? opcoes.filter((o) => o.toLowerCase().includes(termo)) : opcoes
    const lista = filtradas.length > 0 ? filtradas : opcoes
    return lista.slice(0, 8)
  }, [opcoes, value])

  function escolher(opcao: string) {
    onChange(opcao)
    setAberto(false)
    setDestaque(-1)
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setAberto(false)
      setDestaque(-1)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!aberto || sugestoes.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setDestaque((i) => (i + 1) % sugestoes.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setDestaque((i) => (i <= 0 ? sugestoes.length - 1 : i - 1))
    } else if (e.key === 'Enter' && destaque >= 0) {
      e.preventDefault()
      escolher(sugestoes[destaque])
    } else if (e.key === 'Escape') {
      setAberto(false)
      setDestaque(-1)
    }
  }

  return (
    <div ref={containerRef} onBlur={handleBlur} className="relative">
      <input
        type="text"
        value={value}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value)
          setAberto(true)
          setDestaque(-1)
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={handleKeyDown}
        className={`w-full rounded-xl border border-line px-3.5 py-2.5 text-sm bg-surface disabled:bg-surface-2 disabled:text-ink-faint ${className}`}
        autoComplete="off"
      />
      {aberto && sugestoes.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-line bg-surface shadow-lg shadow-black/10 py-1">
          {sugestoes.map((opcao, i) => (
            <li key={opcao}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(opcao)}
                className={`block w-full text-left px-3.5 py-2 text-sm ${
                  i === destaque ? 'bg-surface-2 text-ink' : 'text-ink-soft hover:bg-surface-2'
                }`}
              >
                {opcao}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
