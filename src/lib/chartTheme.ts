import { useTheme } from '@/contexts/ThemeContext'

export interface ChartColors {
  grid: string
  inkMuted: string
  inkPrimary: string
  cursorFill: string
  brand: string
  brandSoft: string
  income: string
  expense: string
  custoFixo: string
}

const LIGHT: ChartColors = {
  grid: '#e5e2d8',
  inkMuted: '#9c9a92',
  inkPrimary: '#1c1c1a',
  cursorFill: 'rgba(28,28,26,0.04)',
  brand: '#c9a227',
  brandSoft: '#e9d38f',
  income: '#2e9b68',
  expense: '#d65c5c',
  custoFixo: '#2a78d6',
}

const DARK: ChartColors = {
  grid: '#35342f',
  inkMuted: '#a9a79f',
  inkPrimary: '#f5f5f2',
  cursorFill: 'rgba(245,245,242,0.06)',
  brand: '#d4af37',
  brandSoft: '#7a672a',
  income: '#33c481',
  expense: '#ff6b6b',
  custoFixo: '#5b9bd8',
}

export function useChartColors(): ChartColors {
  const { tema } = useTheme()
  return tema === 'dark' ? DARK : LIGHT
}
