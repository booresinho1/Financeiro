// Script de autorização única: gera o refresh token usado pelo app para
// ler/escrever na planilha do Google Sheets em nome da sua conta Google.
//
// Uso: node scripts/authorize-google.mjs
// Pré-requisito: .secrets/oauth-client.json (baixado do Google Cloud Console)

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { google } from 'googleapis'

const CLIENT_PATH = new URL('../.secrets/oauth-client.json', import.meta.url)
const TOKEN_PATH = new URL('../.secrets/token.json', import.meta.url)
const PORT = 53682
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

if (!existsSync(CLIENT_PATH)) {
  console.error(
    `\nArquivo não encontrado: ${CLIENT_PATH.pathname}\n` +
      'Baixe o JSON do OAuth Client (tipo "App para computador") no Google Cloud Console\n' +
      'e salve como .secrets/oauth-client.json antes de rodar este script.\n'
  )
  process.exit(1)
}

const { installed } = JSON.parse(readFileSync(CLIENT_PATH, 'utf-8'))
const { client_id, client_secret } = installed
const redirectUri = `http://localhost:${PORT}`

const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
})

const AUTH_URL_PATH = new URL('../.secrets/auth-url.txt', import.meta.url)
writeFileSync(AUTH_URL_PATH, authUrl)

process.stdout.write('\nAbra este link no navegador e autorize com a conta Google dona da planilha:\n')
process.stdout.write(authUrl + '\n')
process.stdout.write(`\n(também salvo em ${AUTH_URL_PATH.pathname})\n`)
process.stdout.write('\nAguardando autorização...\n')

const server = createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri)
  const code = url.searchParams.get('code')

  if (!code) {
    res.writeHead(400)
    res.end('Código de autorização não encontrado.')
    return
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)
    writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2))

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h2>Autorizado com sucesso.</h2> Pode fechar esta aba e voltar pro terminal.')

    console.log(`Token salvo em: ${TOKEN_PATH.pathname}`)
    console.log('Pronto — pode fechar este processo (Ctrl+C).')
  } catch (err) {
    res.writeHead(500)
    res.end('Falha ao trocar o código por token. Veja o terminal.')
    console.error(err)
  } finally {
    server.close()
  }
})

server.listen(PORT)
