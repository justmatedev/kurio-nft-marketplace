import { test, expect } from '@playwright/test'
import { resetMocks, addNftToCart, loginAsAlice, goCheckoutConnected } from './helpers'

import { api, setup } from './api'

test.beforeEach(async ({ page }) => { await resetMocks(page) })

test('pedidos: isolamento, idempotência e conteúdo diferente', async ({ page }) => {
  const { alice, bob, body } = await setup(page)
  const headers = { 'Idempotency-Key': 'same-attempt' }
  const first = await api(page, '/orders', 'POST', body, alice.token, headers)
  expect(first.status).toBe(201)
  expect((await api(page, `/orders/${first.data.id}`, 'GET', undefined, bob.token)).status).toBe(403)
  expect((await api(page, '/orders/attempts/same-attempt', 'GET', undefined, bob.token)).status).toBe(404)
  expect((await api(page, '/orders', 'POST', body, bob.token, headers)).status).not.toBe(201)
  const retry = await api(page, '/orders', 'POST', body, alice.token, headers)
  expect(retry.data.id).toBe(first.data.id)
  const conflict = await api(page, '/orders', 'POST', { ...body, collectorName: 'Different' }, alice.token, headers)
  expect(conflict.data.code).toBe('IDEMPOTENCY_CONFLICT')
  expect((await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'another-key' })).status).toBe(409)
})

test('preço e taxa alterados exigem cotação nova', async ({ page }) => {
  const { alice, body } = await setup(page)
  await api(page, '/dev/emit-nft', 'POST', { nftId: 'nft_001', overrides: { editionId: 'ed_001_50', priceEth: '9.123456789123456789' } })
  const changed = await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'price' })
  expect(changed.status).toBe(409)
  expect(changed.data.code).toBe('QUOTE_CHANGED')
  const quote = (await api(page, '/quote', 'POST', { walletId: body.walletId, network: body.network }, alice.token)).data
  expect(quote.totalEth).toBe('9.125956789123456789')
  await api(page, '/dev/fee', 'POST', { fee: '0.007' })
  expect((await api(page, '/orders', 'POST', { ...body, quoteId: quote.quoteId }, alice.token, { 'Idempotency-Key': 'fee' })).data.code).toBe('QUOTE_CHANGED')
})

test('estoque, cupom e quantidades inválidas bloqueiam compra', async ({ page }) => {
  const { alice, body } = await setup(page)
  for (const quantity of [0, -1, 1.5]) expect((await api(page, '/cart/items', 'POST', { nftId: 'nft_001', editionId: 'ed_001_50', quantity }, alice.token)).status).toBe(400)
  expect((await api(page, '/quote', 'POST', { couponCode: 'EXPIRED' }, alice.token)).status).toBe(400)
  await api(page, '/dev/emit-nft', 'POST', { nftId: 'nft_001', overrides: { editionId: 'ed_001_50', available: 0 } })
  expect((await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'stock' })).status).toBe(409)
})

test('recibo imutável, edição correta e estoque persistente', async ({ page }) => {
  const { alice, body } = await setup(page)
  const first = (await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'receipt' })).data
  const cart = (await api(page, '/cart', 'GET', undefined, alice.token)).data
  await api(page, `/cart/items/${cart.items[0].id}`, 'DELETE', undefined, alice.token)
  await api(page, '/cart/items', 'POST', { nftId: 'nft_001', editionId: 'ed_001_10', quantity: 2 }, alice.token)
  await api(page, '/dev/emit-order', 'POST', { orderId: first.id, overrides: { status: 'confirmed' } })
  expect((await api(page, '/cart', 'GET', undefined, alice.token)).data.items[0].quantity).toBe(2)
  await api(page, '/dev/emit-nft', 'POST', { nftId: 'nft_001', overrides: { editionId: 'ed_001_50', available: 0, priceEth: '99' } })
  await api(page, '/wallets/wal_alice_1', 'PATCH', { label: 'Changed wallet' }, alice.token)
  await page.reload()
  await page.waitForFunction(() => Boolean(window.__KURIO_EMIT_NFT__))
  const recovered = (await api(page, `/orders/${first.id}`, 'GET', undefined, alice.token)).data
  expect(recovered.totalEth).toBe(first.totalEth)
  expect(recovered.walletSnapshot.label).toBe('Principal')
  expect(recovered.status).toBe('confirmed')
  await api(page, '/dev/emit-order', 'POST', { orderId: first.id, overrides: { status: 'rejected' } })
  expect((await api(page, `/orders/${first.id}`, 'GET', undefined, alice.token)).data.status).toBe('confirmed')
  expect((await api(page, '/nfts/nft_001')).data.editions.find((e: { id: string }) => e.id === 'ed_001_50').available).toBe(0)
})

test('cadastro migra carrinho guest sem apagar storage externo', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('external-app', 'keep'))
  await api(page, '/cart/items', 'POST', { nftId: 'nft_001', editionId: 'ed_001_50', quantity: 2 }, undefined, { 'X-Guest-Id': 'guest_test' })
  const registered = await api(page, '/auth/register', 'POST', { name: 'New collector', email: 'new@kurio.dev', password: 'Test1234!', guestId: 'guest_test' })
  expect((await api(page, '/cart', 'GET', undefined, registered.data.token)).data.items[0].quantity).toBe(2)
  await api(page, '/dev/reset', 'POST')
  expect(await page.evaluate(() => localStorage.getItem('external-app'))).toBe('keep')
})

test('Socket.IO conectado recebe preço real; desconexão e replay', async ({ page }) => {
  await page.goto('/nfts/nft_001')
  await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(true)
  await api(page, '/dev/emit-nft', 'POST', { nftId: 'nft_001', overrides: { editionId: 'ed_001_50', priceEth: '3.1234' } })
  await expect(page.getByText('3.1234 ETH', { exact: true }).locator('visible=true').first()).toBeVisible()
  const history = (await api(page, '/dev/events')).data.items
  await page.evaluate(() => window.__KURIO_SOCKET__?.disconnect())
  await api(page, '/dev/emit-nft', 'POST', { nftId: 'nft_001', overrides: { editionId: 'ed_001_50', priceEth: '4.1234' } })
  await expect(page.getByText('3.1234 ETH', { exact: true }).locator('visible=true').first()).toBeVisible()
  await page.evaluate(() => window.__KURIO_SOCKET__?.connect())
  await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(true)
  await expect(page.getByText('4.1234 ETH', { exact: true }).locator('visible=true').first()).toBeVisible()
  await api(page, '/dev/replay', 'POST', { eventId: history[0].eventId })
  await expect(page.getByText('4.1234 ETH', { exact: true }).locator('visible=true').first()).toBeVisible()
})

test('checkout reage ao preço novo via socket e exige aceite', async ({ page }) => {
  await addNftToCart(page)
  await loginAsAlice(page)
  await goCheckoutConnected(page)
  await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(true)
  await api(page, '/dev/emit-nft', 'POST', { nftId: 'nft_001', overrides: { editionId: 'ed_001_50', priceEth: '1.234' } })
  const confirm = page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true')
  await expect(confirm).toBeDisabled()
  await page.getByRole('button', { name: 'Aceitar novos valores' }).locator('visible=true').click()
  await expect(confirm).toBeEnabled()
})

for (const scenario of ['default', 'payment-rejected']) {
  test(`refresh recupera settlement ${scenario} com relógio controlado`, async ({ page }) => {
    const now = new Date('2026-10-25T12:00:00Z')
    await page.clock.setFixedTime(now)
    const { alice, body } = await setup(page)
    const order = (await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'refresh', 'X-Kurio-Scenario': scenario })).data
    expect(order.status).toBe('pending')
    await page.reload()
    await page.waitForFunction(() => Boolean(window.__KURIO_EMIT_NFT__))
    await page.clock.setFixedTime(new Date(now.getTime() + 5000))
    const recovered = (await api(page, `/orders/${order.id}`, 'GET', undefined, alice.token)).data
    expect(recovered.status).toBe(scenario === 'default' ? 'confirmed' : 'rejected')
    const cart = (await api(page, '/cart', 'GET', undefined, alice.token)).data
    expect(cart.items).toHaveLength(scenario === 'default' ? 0 : 1)
  })
}

test('mesmo total com preço e taxa diferentes exige outra revisão', async ({ page }) => {
  const { alice, body, quote } = await setup(page)
  const { default: Decimal } = await import('decimal.js')
  const price = new Decimal(quote.items[0].unitPriceEth).plus('0.001').toFixed()
  await api(page, '/dev/emit-nft', 'POST', { nftId: 'nft_001', overrides: { editionId: 'ed_001_50', priceEth: price } })
  await api(page, '/dev/fee', 'POST', { fee: '0.0015' })
  const current = (await api(page, '/quote', 'POST', { walletId: body.walletId, network: body.network }, alice.token)).data
  expect(current.totalEth).toBe(quote.totalEth)
  expect(current.revision).not.toBe(quote.revision)
  expect((await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'same-total' })).data.code).toBe('QUOTE_CHANGED')
  expect((await api(page, '/orders', 'POST', { ...body, quoteId: current.quoteId }, alice.token, { 'Idempotency-Key': 'new-review' })).status).toBe(201)
})
