import { useTheme } from '@/contexts/ThemeContext'

export interface ChartColors {
  grid: string
  inkMuted: string
  inkPrimary: string
  cursorFill: string
  surface: string
  brand: string
  brandSoft: string
  income: string
  expense: string
  custoFixo: string
  serieEntrada: string
  serieDespesa: string
  /** custos fixos, parcelas e as 3 maiores categorias, nessa ordem (validada lado a lado) */
  composicao: [string, string, string, string, string]
}

// Par de séries (entrada × despesa, e qualquer gráfico de 2 séries) validado com o
// validate_palette.js da skill dataviz: passa CVD/contraste no claro (#fff) e no escuro (#12141a).
const LIGHT: ChartColors = {
  grid: '#eceef3',
  inkMuted: '#8e95a5',
  inkPrimary: '#0c0e14',
  cursorFill: 'rgba(91,76,240,0.06)',
  surface: '#ffffff',
  brand: '#6d5efc',
  brandSoft: '#d9d4ff',
  income: '#12a150',
  expense: '#e5484d',
  custoFixo: '#f2683c',
  serieEntrada: '#6d5efc',
  serieDespesa: '#f2683c',
  composicao: ['#6d5efc', '#f2683c', '#2a78d6', '#eda100', '#e87ba4'],
}

const DARK: ChartColors = {
  grid: '#1f232d',
  inkMuted: '#8b93a5',
  inkPrimary: '#f2f4f8',
  cursorFill: 'rgba(139,128,255,0.08)',
  surface: '#12141a',
  brand: '#8b80ff',
  brandSoft: '#3a3470',
  income: '#3ddc84',
  expense: '#ff6369',
  custoFixo: '#e8643c',
  serieEntrada: '#8b80ff',
  serieDespesa: '#e8643c',
  composicao: ['#8b80ff', '#e8643c', '#3987e5', '#c98500', '#d55181'],
}

export function useChartColors(): ChartColors {
  const { tema } = useTheme()
  return tema === 'dark' ? DARK : LIGHT
}
