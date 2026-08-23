export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function erro(mensagem: string, status = 400): Response {
  return json({ erro: mensagem }, status)
}
