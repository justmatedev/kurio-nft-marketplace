/** SHA-256 hex digest for mock account passwords (never store plaintext). */
export async function hashPassword(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  const candidate = await hashPassword(plain)
  return candidate === passwordHash
}
