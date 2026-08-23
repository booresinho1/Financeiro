import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Tema = 'light' | 'dark'

interface ThemeContextValue {
  tema: Tema
  alternarTema: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const CHAVE_STORAGE = 'financeiro:tema'

function lerTemaInicial(): Tema {
  const salvo = localStorage.getItem(CHAVE_STORAGE)
  if (salvo === 'light' || salvo === 'dark') return salvo
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(lerTemaInicial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', tema === 'dark')
    root.style.colorScheme = tema
    localStorage.setItem(CHAVE_STORAGE, tema)
  }, [tema])

  function alternarTema() {
    setTema((atual) => (atual === 'dark' ? 'light' : 'dark'))
  }

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>')
  return ctx
}
