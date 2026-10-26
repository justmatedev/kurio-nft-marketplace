import { test, expect } from '@playwright/test'
import { api, setup } from './api'
import { resetMocks, loginAsAlice, loginAsBob, clickLogout, addNftToCart, goCheckoutConnected, setScenario } from './helpers'

test.beforeEach(async ({ page }) => { await resetMocks(page) })

test('mesma chave em duas contas cria pedidos independentes; carteira alheia é proibida', async ({ page }) => {
  const { alice, bob, body } = await setup(page)
  const headers = { 'Idempotency-Key': 'shared' }
  expect((await api(page, '/cart', 'GET', undefined, undefined, { 'X-Guest-Id': alice.user.id })).data.items).toHaveLength(0)
  expect((await api(page, '/orders', 'POST', { ...body, walletId: 'wal_bob_1' }, alice.token, headers)).status).toBe(403)
  expect((await api(page, '/orders', 'POST', { ...body, network: 'Solana' }, alice.token, headers)).status).toBe(403)
  const first = (await api(page, '/orders', 'POST', body, alice.token, headers)).data
  await api(page, '/cart/items', 'POST', { nftId: 'nft_002', editionId: 'ed_002_50', quantity: 1 }, bob.token)
  const wallets = (await api(page, '/wallets', 'GET', undefined, bob.token)).data.items
  const wallet = wallets[0]
  const quote = (await api(page, '/quote', 'POST', { walletId: wallet.id, network: wallet.network }, bob.token)).data
  const second = await api(page, '/orders', 'POST', { ...body, quoteId: quote.quoteId, walletId: wallet.id, network: wallet.network, collectorEmail: bob.user.email }, bob.token, headers)
  expect(second.status).toBe(201)
  expect(second.data.id).not.toBe(first.id)
})

test('revisão exige aceite mesmo após desfazer quantidade; cotação vence por relógio', async ({ page }) => {
  const { alice, body } = await setup(page)
  const cart = (await api(page, '/cart', 'GET', undefined, alice.token)).data
  for (const quantity of [2, 1]) await api(page, `/cart/items/${cart.items[0].id}`, 'PATCH', { quantity }, alice.token)
  expect((await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'revision' })).data.code).toBe('QUOTE_CHANGED')
  const quote = (await api(page, '/quote', 'POST', { walletId: body.walletId, network: body.network }, alice.token)).data
  await page.clock.setFixedTime(new Date(new Date(quote.expiresAt).getTime() + 1))
  expect((await api(page, '/orders', 'POST', { ...body, quoteId: quote.quoteId }, alice.token, { 'Idempotency-Key': 'expired' })).data.code).toBe('QUOTE_CHANGED')
})

test('cupom expira entre revisão e compra', async ({ page }) => {
  const { alice, body } = await setup(page)
  const quote = (await api(page, '/quote', 'POST', { walletId: body.walletId, network: body.network, couponCode: 'MINT10' }, alice.token)).data
  const result = await api(page, '/orders', 'POST', { ...body, quoteId: quote.quoteId }, alice.token, { 'Idempotency-Key': 'coupon', 'X-Kurio-Scenario': 'coupon-expired' })
  expect(result.data.code).toBe('QUOTE_CHANGED')
  expect((await api(page, '/orders/attempts/coupon', 'GET', undefined, alice.token)).status).toBe(404)
})

test('reserva é liberada uma vez na recusa; confirmação subtrai apenas quantidade comprada', async ({ page }) => {
  const { alice, body } = await setup(page)
  const stock = async () => (await api(page, '/nfts/nft_001')).data.editions.find((e: { id: string }) => e.id === 'ed_001_50').available
  const initial = await stock()
  const order = (await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'reserve' })).data
  expect(await stock()).toBe(initial - 1)
  for (let i = 0; i < 2; i++) await api(page, '/dev/emit-order', 'POST', { orderId: order.id, overrides: { status: 'rejected' } })
  expect(await stock()).toBe(initial)
  const quote = (await api(page, '/quote', 'POST', { walletId: body.walletId, network: body.network }, alice.token)).data
  const next = (await api(page, '/orders', 'POST', { ...body, quoteId: quote.quoteId }, alice.token, { 'Idempotency-Key': 'consume' })).data
  const cart = (await api(page, '/cart', 'GET', undefined, alice.token)).data
  await api(page, `/cart/items/${cart.items[0].id}`, 'PATCH', { quantity: 3 }, alice.token)
  await api(page, '/dev/emit-order', 'POST', { orderId: next.id, overrides: { status: 'confirmed' } })
  expect((await api(page, '/cart', 'GET', undefined, alice.token)).data.items[0].quantity).toBe(2)
  expect(await stock()).toBe(initial - 1)
})

test('socket de Bob não recebe evento privado de Alice', async ({ page }) => {
  await loginAsBob(page)
  await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(true)
  await page.evaluate(() => {
    const socket = window.__KURIO_SOCKET__ as unknown as { on: (name: string, fn: () => void) => void }
    socket.on('order.updated', () => document.body.dataset.privateEvent = 'received')
  })
  const { alice, body } = await setup(page)
  const order = (await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'private' })).data
  await api(page, '/dev/emit-order', 'POST', { orderId: order.id, overrides: { status: 'confirmed' } })
  expect(await page.locator('body').getAttribute('data-private-event')).toBeNull()
  await expect(page.getByText('Pedido confirmado', { exact: true })).toHaveCount(0)
})

test('conexão indisponível recupera por Socket.IO ao reconectar', async ({ page }) => {
  await setScenario(page, 'socket-unavailable')
  await page.goto('/nfts/nft_001')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(false)
  await setScenario(page, 'default')
  await page.evaluate(() => { window.__KURIO_SOCKET__?.disconnect(); window.__KURIO_SOCKET__?.connect() })
  await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(true)
})

test('falha transitória preserva sessão e permite retry', async ({ page }) => {
  await loginAsAlice(page)
  const token = await page.evaluate(() => localStorage.getItem('kurio:token'))
  await setScenario(page, 'network-error')
  await page.goto('/profile')
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kurio:token'))).toBe(token)
  await setScenario(page, 'default')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.locator('#email')).toHaveValue('alice@kurio.dev')
})

test('rascunho na expiração só reaparece para o mesmo usuário', async ({ page }) => {
  await addNftToCart(page)
  await loginAsAlice(page)
  await goCheckoutConnected(page)
  await page.locator('#display-name, #m-display-name').locator('visible=true').fill('Alice Rascunho')
  await setScenario(page, 'session-expired')
  await page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await setScenario(page, 'default')
  await loginAsBob(page)
  await page.goto('/checkout')
  await expect(page.getByText('Carrinho vazio.', { exact: false })).toBeVisible()
  await clickLogout(page)
  await loginAsAlice(page)
  await page.goto('/checkout')
  // The exact persisted attempt is recovered after login; the collector snapshot is retained.
  await expect(page).toHaveURL(/orders\//)
  await expect(page.getByText('Alice Rascunho', { exact: true })).toBeVisible({ timeout: 15_000 })
})

test('busca com respostas fora de ordem mantém o filtro mais recente', async ({ page }) => {
  await setScenario(page, 'out-of-order')
  await page.goto('/')
  await expect(page.locator('#catalogo h3').first()).toBeVisible()
  const headerSearch = page.getByRole('button', { name: 'Buscar NFTs' })
  if (await headerSearch.isVisible()) await headerSearch.click()
  const search = page.getByRole('searchbox').locator('visible=true').first()
  const older = page.waitForRequest(req => req.url().includes('/api/nfts?') && req.url().includes('q=Ape'))
  await search.fill('Ape')
  await older
  await search.fill('Violet')
  await expect(page).toHaveURL(/q=Violet/)
  await expect(page.locator('#catalogo h3').first()).toContainText('Violet')
  await page.waitForTimeout(1300) // Explicit scenario: the older request completes at 1200 ms.
  await expect(page.locator('#catalogo h3').first()).toContainText('Violet')
})

test('checkout mantém campos e foco com zoom de 200%', async ({ page }) => {
  await addNftToCart(page)
  await loginAsAlice(page)
  await goCheckoutConnected(page)
  const viewport = page.viewportSize()!
  // Browser zoom halves the CSS layout viewport. Keep that reflow constraint reproducible.
  await page.setViewportSize({ width: Math.floor(viewport.width / 2), height: Math.floor(viewport.height / 2) })
  const name = page.locator('#display-name, #m-display-name').locator('visible=true')
  await name.fill('')
  await page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true').click()
  await expect(name).toBeFocused()
  await expect(name).toHaveAttribute('aria-describedby', /error/)
  await expect(page.getByText('Mínimo 2 caracteres').locator('visible=true')).toBeVisible()
  const notes = page.locator('#notes, #m-notes').locator('visible=true')
  await notes.fill('Conteúdo preservado')
  await notes.scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  await expect(notes).toHaveValue('Conteúdo preservado')
})
