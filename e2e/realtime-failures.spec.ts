import { test, expect } from '@playwright/test'
import { api } from './api'
import type { NftUpdatedEvent } from '../src/shared/api/types'
import {
  addNftToCart,
  disconnectSocket,
  goCheckoutConnected,
  loginAsAlice,
  reconnectSocket,
  resetMocks,
  setScenario,
} from './helpers'

test.describe('Tempo real e falhas', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('skeleton em carregamento lento', async ({ page }) => {
    await setScenario(page, 'slow')
    await page.goto('/')
    await expect(page.getByLabel('Carregando catálogo')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('#catalogo')).toBeVisible()
    await expect(page.locator('#catalogo h3').first()).toBeVisible({ timeout: 20_000 })
  })

  test('pagamento recusado', async ({ page }) => {
    await setScenario(page, 'payment-rejected')
    await addNftToCart(page, 'nft_004')
    await loginAsAlice(page)
    await goCheckoutConnected(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true').click()
    await expect(page).toHaveURL(/orders\//, { timeout: 20_000 })
    await expect(page.getByText(/Recusado|recusado/i).first()).toBeVisible({ timeout: 25_000 })
  })

  test('price-changed no checkout bloqueia confirmação', async ({ page }) => {
    await setScenario(page, 'price-changed')
    await addNftToCart(page, 'nft_001')
    await loginAsAlice(page)
    await page.goto('/checkout')
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible({
      timeout: 15_000,
    })
    await page.locator('#display-name, #m-display-name').locator('visible=true').fill('Alice Colecionadora')
    await page.locator('#username, #m-username').locator('visible=true').fill('alice')
    await page.locator('#email, #m-email').locator('visible=true').fill('alice@kurio.dev')
    await page.getByRole('radio').locator('visible=true').first().click()
    await page.getByRole('button', { name: 'Simular conexão' }).locator('visible=true').click()
    await expect(
      page.getByText(/Status da carteira: connected/).locator('visible=true'),
    ).toBeVisible()
    await expect(
      page.getByText(/Cotação desatualizada/i).locator('visible=true'),
    ).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true'),
    ).toBeDisabled()
    await page.getByRole('button', { name: 'Aceitar novos valores' }).locator('visible=true').click()
    await expect(
      page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true'),
    ).toBeEnabled()
  })


  test('esgotamento via Socket.IO bloqueia compra e reposição exige novo aceite', async ({ page }) => {
    await addNftToCart(page, 'nft_001')
    await loginAsAlice(page)
    await goCheckoutConnected(page)
    await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(true)
    const confirm = page.getByRole('button', { name: 'Confirmar compra', exact: true }).locator('visible=true')
    await expect(confirm).toBeEnabled()
    await expect(page.getByRole('status').filter({ hasText: 'Atualizando dados' })).toHaveCount(0)
    const token = await page.evaluate(() => localStorage.getItem('kurio:token'))
    const cartBefore = await api(page, '/cart', 'GET', undefined, token!)
    const item = cartBefore.data.items[0]
    expect(item.quantity).toBeGreaterThan(0)
    const nftBefore = (await api(page, `/nfts/${item.nftId}`)).data
    const available = nftBefore.editions.find((edition: { id: string }) => edition.id === item.editionId).available
    const received: NftUpdatedEvent[] = []
    await page.exposeFunction('recordStockEvent', (event: NftUpdatedEvent) => { received.push(event) })
    await page.evaluate(() => {
      // Observation only: no cache writes, callbacks into the UI or synthetic events.
      const observer = window as typeof window & { recordStockEvent: (event: NftUpdatedEvent) => Promise<void> }
      window.__KURIO_SOCKET__!.on('nft.updated', (event: NftUpdatedEvent) => { void observer.recordStockEvent(event) })
    })
    const orders: string[] = []
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/orders' && request.method() === 'POST') orders.push(request.url())
    })
    const updateStock = async (stock: number) => {
      const response = await api(page, '/dev/emit-nft', 'POST', { nftId: item.nftId, overrides: { editionId: item.editionId, available: stock } })
      expect(response.status).toBe(200)
    }
    await updateStock(0)
    await expect.poll(() => received.find(event => event.id === item.nftId && event.available === 0)).toMatchObject({
      eventId: expect.any(String), id: item.nftId, editionId: item.editionId, version: nftBefore.version + 1, available: 0,
    })
    const soldOutEvent = received.find(event => event.id === item.nftId && event.available === 0)!
    expect(soldOutEvent.eventId).not.toBe('')
    const stockAlert = page.getByRole('alert').filter({ hasText: 'Cupom inválido ou estoque insuficiente' }).locator('visible=true')
    await expect(stockAlert).toBeVisible()
    await expect(confirm).toBeDisabled()
    const accept = page.getByRole('button', { name: 'Aceitar novos valores', exact: true }).locator('visible=true')
    await expect(accept).toBeVisible()
    await accept.click()
    await expect(accept).toHaveCount(0)
    await expect(stockAlert).toBeVisible()
    await expect(confirm).toBeDisabled()
    const cartBlocked = await api(page, '/cart', 'GET', undefined, token!)
    expect(cartBlocked.data.items).toEqual([expect.objectContaining({ id: item.id, nftId: item.nftId, editionId: item.editionId, quantity: item.quantity, available: 0 })])
    expect(orders).toEqual([])

    await updateStock(available)
    await expect.poll(() => received.find(event => event.version === nftBefore.version + 2)).toMatchObject({
      id: item.nftId, editionId: item.editionId, version: nftBefore.version + 2, available,
    })
    const restoredEvent = received.find(event => event.version === nftBefore.version + 2)!
    expect(restoredEvent.eventId).not.toBe(soldOutEvent.eventId)
    await expect(stockAlert).toHaveCount(0)
    await expect(accept).toBeVisible()
    await expect(confirm).toBeDisabled()
    await accept.click()
    await expect(confirm).toBeEnabled()
    expect((await api(page, '/cart', 'GET', undefined, token!)).data.items).toEqual(cartBefore.data.items)
    expect(orders).toEqual([])
  })

  test('clique repetido cria um único pedido', async ({ page }) => {
    await addNftToCart(page, 'nft_001')
    await loginAsAlice(page)
    await goCheckoutConnected(page)
    let creations = 0
    page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/api/orders')) creations++ })
    const confirm = page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true')
    await confirm.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click() })
    await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 20_000 })
    expect(creations).toBe(1)
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('kurio:mock-store-v3')!).orders).length)).toBe(1)
    const url = page.url()
    const id = url.match(/\/orders\/(ord_[^/?#]+)/)?.[1]
    expect(id).toBeTruthy()
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/orders/${id}`))
  })

  test('order-timeout recupera o mesmo pedido', async ({ page }) => {
    await setScenario(page, 'order-timeout')
    await addNftToCart(page, 'nft_002')
    await loginAsAlice(page)
    await goCheckoutConnected(page)
    const started = Date.now()
    await page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true').click()
    await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 20_000 })
    expect(Date.now() - started).toBeGreaterThanOrEqual(8000)
    expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('kurio:mock-store-v3')!).orders).length)).toBe(1)
    const orderUrl = page.url()
    const id = orderUrl.match(/\/orders\/(ord_[^/?#]+)/)?.[1]
    expect(id).toBeTruthy()

    await expect(page.getByText(/Aguardando confirmação/i)).toBeVisible({ timeout: 10_000 })
    await page.reload()
    await expect(page).toHaveURL(new RegExp(`/orders/${id}`))
    await expect(
      page.getByRole('heading', { name: /Seus NFTs agora estão na sua carteira|Confirmado/i }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test('eventos stale e duplicados são ignorados', async ({ page }) => {
    await page.goto('/nfts/nft_001')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    await expect
      .poll(async () => page.evaluate(() => typeof window.__KURIO_EMIT_NFT__ === 'function'))
      .toBe(true)

    await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(true)
    const eventIds = await page.evaluate(async () => {
      for (const priceEth of ['0.001', '9.999']) {
        await fetch('/api/dev/emit-nft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nftId: 'nft_001', overrides: { editionId: 'ed_001_50', priceEth } }) })
      }
      const history = await fetch('/api/dev/events').then(r => r.json())
      return history.items.map((e: { eventId: string }) => e.eventId) as string[]
    })
    await expect(page.getByText('9.999 ETH', { exact: true }).locator('visible=true').first()).toBeVisible()
    await page.evaluate(async ids => {
      for (const eventId of [ids[1], ids[0], ids[1]]) await fetch('/api/dev/replay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId }) })
    }, eventIds)
    await expect(page.getByText('9.999 ETH', { exact: true }).locator('visible=true').first()).toBeVisible()
    await expect(page.getByText('0.001 ETH', { exact: true })).toHaveCount(0)
  })

  test('skeleton no detalhe e resumo do carrinho', async ({ page }) => {
    await setScenario(page, 'slow')
    await page.goto('/nfts/nft_001')
    await expect(page.getByLabel('Carregando detalhe do NFT')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })

    await setScenario(page, 'slow')
    await page.goto('/cart')
    await expect(page.getByLabel(/Carregando carrinho|Carregando resumo/i).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('disconnect e retomada de pedido pendente', async ({ page }) => {
    await setScenario(page, 'order-timeout')
    await addNftToCart(page, 'nft_003')
    await loginAsAlice(page)
    await goCheckoutConnected(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true').click()
    await expect(page).toHaveURL(/\/orders\/ord_/, { timeout: 20_000 })
    const id = page.url().match(/\/orders\/(ord_[^/?#]+)/)?.[1]
    expect(id).toBeTruthy()

    await expect(page.getByText(/Aguardando confirmação/i)).toBeVisible()
    await disconnectSocket(page)
    await page.waitForTimeout(300)
    await reconnectSocket(page)

    await expect(
      page.getByRole('heading', {
        name: /Seus NFTs agora estão na sua carteira|Confirmado|Pagamento recusado/i,
      }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page).toHaveURL(new RegExp(`/orders/${id}`))
  })
})
