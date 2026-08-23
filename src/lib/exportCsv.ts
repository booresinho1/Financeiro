function escaparCampo(valor: string): string {
  if (/[;"\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`
  }
  return valor
}

export function baixarCsv(nomeArquivo: string, cabecalho: string[], linhas: string[][]) {
  const todasLinhas = [cabecalho, ...linhas]
  const conteudo = todasLinhas.map((linha) => linha.map(escaparCampo).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
