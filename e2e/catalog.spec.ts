import { test, expect } from '@playwright/test'
import { resetMocks, setScenario } from './helpers'

test.describe('Catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('busca, filtros combinados, ordenação, paginação e histórico', async ({ page }) => {
    await page.goto('/')
    await expect(
      page
        .getByRole('heading', { name: /Seja dono do futuro/i })
        .or(page.getByRole('heading', { name: /Seja dono da/i })),
    ).toBeVisible()
    await expect(page.locator('#catalogo h3').first()).toBeVisible()
    await expect(page).toHaveURL('/')

    const headerSearch = page.getByRole('button', { name: 'Buscar NFTs' })
    if (await headerSearch.isVisible().catch(() => false)) {
      await headerSearch.click()
      await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('Ape')
    } else {
      await page.getByRole('searchbox', { name: 'Explorar coleções' }).fill('Ape')
    }
    await expect(page).toHaveURL(/q=Ape/, { timeout: 5000 })
    expect(new URL(page.url()).searchParams.has('sort')).toBe(false)
    expect(new URL(page.url()).searchParams.has('page')).toBe(false)
    expect(new URL(page.url()).searchParams.has('tab')).toBe(false)

    await page.locator('#catalogo').scrollIntoViewIfNeeded()
    const mobileFilters = page.getByRole('button', { name: 'Abrir filtros' })
    if (await mobileFilters.isVisible().catch(() => false)) {
      await mobileFilters.click()
      const sheet = page.getByRole('dialog').filter({
        has: page.getByRole('heading', { name: 'Filtros' }),
      })
      await expect(sheet).toBeVisible()
      await sheet.locator('button[aria-haspopup="listbox"]').click()
      await page.locator('[role="option"]', { hasText: 'Menor preço' }).locator('button').click()
      await expect(page).toHaveURL(/sort=price_asc/)
      await sheet.getByRole('button', { name: /^Arte digital/ }).click()
      await sheet.getByRole('button', { name: 'Fechar filtros' }).click()
    } else {
      await page.locator('#catalogo button[aria-haspopup="listbox"]').click()
      await page.locator('#catalogo [role="option"]', { hasText: 'Menor preço' }).click()
      await page.getByRole('button', { name: /^Arte digital/ }).click()
    }
    await expect(page).toHaveURL(/collection=Arte(\+|%20|\s)?digital/)
    await expect(page).toHaveURL(/q=Ape/)
    await expect(page).toHaveURL(/sort=price_asc/)

    const combinedUrl = page.url()

    await page.goto('/?sort=price_asc&collection=Arte+digital')
    await expect(page.locator('#catalogo h3').first()).toBeVisible()
    const paginatedUrl = page.url()
    const next = page.getByRole('button', { name: 'Próxima página' })
    await expect(next).toBeEnabled()
    {
      await next.click()
      await expect(page).toHaveURL(/page=2/)
      await page.reload()
      await expect(page).toHaveURL(/page=2/)
      await expect(page.locator('#catalogo h3').first()).toBeVisible()
      await page.goBack()
      await expect(page).toHaveURL(paginatedUrl)
      await page.goBack()
      await expect(page).toHaveURL(combinedUrl)
    }

    expect(page.url()).toMatch(/q=Ape/)
    expect(page.url()).toMatch(/sort=price_asc/)
    expect(page.url()).toMatch(/collection=Arte/)
  })

  test('detalhe inexistente', async ({ page }) => {
    await page.goto('/nfts/nft_does_not_exist')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  })

  test('acesso direto ao detalhe', async ({ page }) => {
    await page.goto('/nfts/nft_001')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Comprar( NFT)?$/ }).locator('visible=true')).toBeVisible()
  })

  test('falha de catálogo e recuperação', async ({ page }) => {
    await setScenario(page, 'catalog-error')
    await page.goto('/')
    await expect(page.getByRole('alert')).toContainText(/Falha ao carregar/i)
    await setScenario(page, 'default')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.locator('#catalogo h3').first()).toBeVisible({ timeout: 15_000 })
  })
})
