export function generateId(): string {
  return crypto.randomUUID().split('-')[0]
}
