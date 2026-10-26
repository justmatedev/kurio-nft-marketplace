import { test, expect } from '@playwright/test'
import {
  addNftToCart,
  goCheckoutConnected,
  loginAsAlice,
  resetMocks,
  setScenario,
} from './helpers'

test.describe('Carrinho e compra', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('adicionar, cupom, persistência e compra completa', async ({ page }) => {
    await addNftToCart(page, 'nft_001')
    await page.goto('/cart')
    const summary = page.getByLabel('Resumo da carteira')
    await expect(summary).toBeVisible()
    await expect(page.getByText(/ETH/).first()).toBeAttached()

    await page.getByLabel('Código promocional').fill('MINT10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText(/Desconto/)).toBeVisible()

    await page.reload()
    await expect(summary).toBeVisible()

    await loginAsAlice(page)
    await goCheckoutConnected(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true').click()
    await expect(page).toHaveURL(/orders\//, { timeout: 20_000 })
    await expect(
      page.getByRole('heading', { name: /Seus NFTs agora estão na sua carteira|Confirmado/i }),
    ).toBeVisible({
      timeout: 25_000,
    })
  })

  test('quantidade, remoção e merge guest→user', async ({ page }) => {
    await addNftToCart(page, 'nft_001')
    await page.goto('/cart')
    await expect(page.getByLabel('Resumo da carteira')).toBeVisible()
    const isMobile = (page.viewportSize()?.width ?? 1440) < 768
    if (isMobile) {
      await expect(page.getByRole('contentinfo')).toBeHidden()
    } else {
      await expect(page.getByRole('contentinfo')).toBeVisible()
    }

    const qty = page
      .getByRole('region', { name: 'Itens do carrinho' })
      .locator('ul:visible [aria-live="polite"]')
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(qty).toHaveText('2', { timeout: 10_000 })

    await page.getByRole('button', { name: 'Diminuir quantidade' }).click()
    await expect(qty).toHaveText('1', { timeout: 10_000 })

    await loginAsAlice(page)
    await page.goto('/cart')
    const remove = page.getByRole('button', { name: /^Remover / }).locator('visible=true')
    await expect(remove).toBeVisible()

    await remove.click()
    await expect(page.getByText(/vazio|nenhum|adicione/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('recusa de carteira impede confirmação', async ({ page }) => {
    await addNftToCart(page, 'nft_001')
    await loginAsAlice(page)
    await page.goto('/checkout')
    await page.getByRole('radio').locator('visible=true').first().click()
    await page.getByRole('button', { name: 'Simular recusa' }).locator('visible=true').click()
    await expect(page.getByText(/Status da carteira: refused/).locator('visible=true')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true'),
    ).toBeDisabled()
  })

  test('cupom inválido', async ({ page }) => {
    await setScenario(page, 'coupon-invalid')
    await addNftToCart(page, 'nft_002')
    await page.goto('/cart')
    await page.getByLabel('Código promocional').fill('MINT10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText(/inválido|expirado/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('remover cupom', async ({ page }) => {
    await addNftToCart(page, 'nft_001')
    await page.goto('/cart')
    await page.getByLabel('Código promocional').fill('MINT10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByRole('button', { name: 'Remover cupom' })).toBeVisible({
      timeout: 10_000,
    })
    await page.getByRole('button', { name: 'Remover cupom' }).click()
    await expect(page.getByText(/Cupom removido/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Remover cupom' })).toHaveCount(0)
  })

  test('favoritos otimista', async ({ page }) => {
    await loginAsAlice(page)
    await page.goto('/nfts/nft_003')
    const fav = page.getByRole('button', { name: 'Favoritar', exact: true })
    await expect(fav).toHaveAttribute('aria-pressed', 'false')
    await fav.click()
    await expect(
      page.getByRole('button', { name: /Favoritar|Remover dos favoritos/ }).first(),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('favoritos falha e rollback', async ({ page }) => {
    await loginAsAlice(page)
    await setScenario(page, 'favorites-fail')
    await page.goto('/nfts/nft_003')
    const fav = page.getByRole('button', { name: 'Favoritar', exact: true })
    await expect(fav).toHaveAttribute('aria-pressed', 'false')
    await fav.click()
    await expect(page.getByText(/Não foi possível atualizar favoritos/i).first()).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole('button', { name: 'Favoritar', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
