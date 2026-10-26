import type { Page } from '@playwright/test'
export async function api(page: Page, path: string, method = 'GET', body?: unknown, token?: string, headers: Record<string, string> = {}) {
  return page.evaluate(async ({ path, method, body, token, headers }) => {
    const res = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', 'X-Kurio-Scenario': 'default', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
    return { status: res.status, data: await res.json() }
  }, { path, method, body, token, headers })
}
export async function setup(page: Page) {
  const { data: alice } = await api(page, '/auth/login', 'POST', { email: 'alice@kurio.dev', password: 'Alice123!' })
  const { data: bob } = await api(page, '/auth/login', 'POST', { email: 'bob@kurio.dev', password: 'Bob1234!' })
  await api(page, '/cart/items', 'POST', { nftId: 'nft_001', editionId: 'ed_001_50', quantity: 1 }, alice.token)
  const quote = await api(page, '/quote', 'POST', { walletId: 'wal_alice_1', network: 'Ethereum' }, alice.token)
  const body = { quoteId: quote.data.quoteId, collectorName: alice.user.name, collectorEmail: alice.user.email, walletId: 'wal_alice_1', network: 'Ethereum' }
  return { alice, bob, body, quote: quote.data }
}

