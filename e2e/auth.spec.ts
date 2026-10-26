import { test, expect } from '@playwright/test'
import {
  clickLogout,
  loginAsAlice,
  openAuthEntry,
  registerUniqueUser,
  resetMocks,
  setScenario,
} from './helpers'

test.describe('Conta e sessão', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('login, logout e troca de usuário', async ({ page }) => {
    await loginAsAlice(page)
    await clickLogout(page)
    await expect(
      page
        .getByRole('button', { name: 'Entrar' })
        .or(page.getByRole('button', { name: 'Abrir menu' }))
        .or(page.getByRole('button', { name: 'Perfil' })),
    ).toBeVisible()

    await page.goto('/')
    await openAuthEntry(page)
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('E-mail').fill('bob@kurio.dev')
    await dialog.getByRole('textbox', { name: 'Senha', exact: true }).fill('Bob1234!')
    await dialog.getByRole('button', { name: 'Entrar' }).click()
    await expect
      .poll(async () => page.evaluate(() => Boolean(localStorage.getItem('kurio:token'))))
      .toBe(true)
  })

  test('cadastro com sucesso', async ({ page }) => {
    await registerUniqueUser(page)
    await expect
      .poll(async () => page.evaluate(() => Boolean(localStorage.getItem('kurio:token'))))
      .toBe(true)
  })

  test('cadastro com conflito', async ({ page }) => {
    await page.goto('/')
    await openAuthEntry(page)
    const dialog = page.getByRole('dialog')
    const isMobile = (page.viewportSize()?.width ?? 1440) < 768
    if (isMobile) {
      await dialog.getByRole('button', { name: /Novo na Kurio\? Crie uma conta/i }).click()
    } else {
      await dialog.getByRole('tab', { name: 'Criar conta' }).click()
    }
    await dialog.getByLabel('Nome de usuário').fill('Alice Clone')
    await dialog.getByLabel('E-mail').fill('alice@kurio.dev')
    await dialog.getByRole('textbox', { name: 'Senha', exact: true }).fill('Alice123!')
    await dialog.getByRole('textbox', { name: 'Confirmar senha' }).fill('Alice123!')
    await dialog
      .getByRole('button', { name: isMobile ? 'Criar perfil' : 'Criar conta' })
      .click()
    await expect(page.getByText(/já/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('checkout exige autenticação', async ({ page }) => {
    await page.goto('/checkout')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const isMobile = (page.viewportSize()?.width ?? 1440) < 768
    if (isMobile) {
      await expect(dialog).toHaveAccessibleName('Entrar')
    } else {
      await expect(page.getByRole('tab', { name: 'Entrar' })).toBeVisible()
    }
  })

  test('sessão expirada limpa autenticação', async ({ page }) => {
    await loginAsAlice(page)
    await setScenario(page, 'session-expired')
    await page.reload()
    await expect
      .poll(async () => page.evaluate(() => Boolean(localStorage.getItem('kurio:token'))))
      .toBe(false)
    await page.goto('/profile')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
  })
})
