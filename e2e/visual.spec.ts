import { test, expect, type Page } from '@playwright/test'
import { addNftToCart, loginAsAlice, resetMocks } from './helpers'

test.describe('Regressão visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-25T12:00:00Z') })
    await resetMocks(page)
  })

  test('início', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#catalogo')).toBeVisible()
    await expect(page.locator('#catalogo h3').first()).toBeVisible()
    await stabilize(page)
    await expect(page).toHaveScreenshot('home.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('detalhe', async ({ page }) => {
    await page.goto('/nfts/nft_001')
    await expect(page.getByRole('button', { name: /^Comprar( NFT)?$/ }).locator('visible=true')).toBeVisible()
    await stabilize(page)
    await expect(page).toHaveScreenshot('detail.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('carrinho', async ({ page }) => {
    await addNftToCart(page, 'nft_001')
    await page.goto('/cart')
    await expect(page.getByLabel('Resumo da carteira')).toBeVisible()
    await stabilize(page)
    await expect(page).toHaveScreenshot('cart.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('pagamento', async ({ page }) => {
    await addNftToCart(page, 'nft_001')
    await loginAsAlice(page)
    await page.goto('/checkout')
    const isMobile = (page.viewportSize()?.width ?? 1440) < 768
    await expect(
      page.getByRole('heading', {
        name: isMobile ? 'Pagamento com carteira' : 'Perfil do colecionador',
      }),
    ).toBeVisible({ timeout: 15_000 })
    await stabilize(page)
    await expect(page).toHaveScreenshot('checkout.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    })
  })
})

async function stabilize(page: Page) {
  await expect(page.locator('.skeleton-shimmer:visible')).toHaveCount(0)
  await expect(page.getByRole('status').filter({ hasText: 'Atualizando dados' })).toHaveCount(0)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images).map(img => {
      if (img.loading === 'lazy') img.loading = 'eager'
      return img.decode().catch(() => undefined)
    }))
  })
  const firstSlide = page.getByRole('tab', { name: 'Slide 1: Emerald Ape' }).locator('visible=true')
  if (await firstSlide.count()) await firstSlide.click()
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10))
  await expect(page.getByText('Carregando…', { exact: true })).toHaveCount(0)
}
