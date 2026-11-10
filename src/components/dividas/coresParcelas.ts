const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const rotuloMes = (mes: string) => `${MESES[Number(mes.slice(5)) - 1]}/${mes.slice(2, 4)}`
