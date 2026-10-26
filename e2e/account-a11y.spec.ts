import { test, expect, type Page } from '@playwright/test'
import { api } from './api'
import type { Wallet } from '../src/shared/api/types'
import { loginAsAlice, openAuthEntry, resetMocks } from './helpers'

const EVM_ADDRESS = '0x1111111111111111111111111111111111111111'

test.describe('Perfil, carteiras e a11y', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
    await loginAsAlice(page)
  })

  test('editar perfil e carteira', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('#email')).toHaveValue(/@/, { timeout: 10_000 })
    await page.locator('#display-name').click()
    await page.locator('#display-name').fill('')
    await page.locator('#display-name').pressSequentially('Alice Atualizada', { delay: 15 })
    await expect(page.locator('#display-name')).toHaveValue('Alice Atualizada')
    const profileSaved = page.waitForResponse(response => response.url().endsWith('/api/profile') && response.request().method() === 'PATCH')
    await page.getByRole('button', { name: 'Salvar' }).click()
    expect((await profileSaved).status()).toBe(200)
    await page.reload()
    await expect(page.locator('#display-name')).toHaveValue('Alice Atualizada', { timeout: 10_000 })

    await page.goto('/wallets')
    await expect(page.locator('#wallet-email')).toHaveValue(/@/, { timeout: 10_000 })
    await page.locator('#label').fill('')
    await page.locator('#label').pressSequentially('Hot wallet', { delay: 10 })
    await page.locator('#address').fill('0xABCDEF1234567890ABCDEF')
    await page.locator('#network').selectOption('Ethereum')
    await page.locator('#wallet-type').selectOption('MetaMask')
    await page.locator('#wallet-email').fill('alice@kurio.dev')
    const walletSaved = page.waitForResponse(response => response.url().endsWith('/api/wallets/wal_alice_1') && response.request().method() === 'PATCH')
    const primary = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Carteira principal', exact: true }) })
    await primary.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
    expect((await walletSaved).status()).toBe(200)
    await page.reload()
    await expect(page.locator('#label')).toHaveValue('Hot wallet', { timeout: 10_000 })
    await expect(page.locator('#address')).toHaveValue('0xABCDEF1234567890ABCDEF')
    await expect(page.locator('#network')).toHaveValue('Ethereum')
    expect(await readWallets(page)).toEqual([expect.objectContaining({ id: 'wal_alice_1', label: 'Hot wallet', address: '0xABCDEF1234567890ABCDEF', network: 'Ethereum', isPrimary: true })])
  })


  for (const kind of ['principal', 'secundária'] as const) {
    for (const invalid of [
      { name: 'endereço malformado', address: 'endereco-invalido', network: 'Ethereum', field: 'address' },
      { name: 'rede não selecionada', address: EVM_ADDRESS, network: '', field: 'network' },
      { name: 'endereço incompatível com Solana', address: EVM_ADDRESS, network: 'Solana', field: 'address' },
    ]) {
      test(`carteira ${kind}: rejeita ${invalid.name} sem mutation`, async ({ page }) => {
        await page.goto('/wallets')
        await expect(page.locator('#wallet-email')).toHaveValue('alice@kurio.dev')
        const before = await readWallets(page)
        const section = page.locator('section').filter({ has: page.getByRole('heading', { name: `Carteira ${kind}`, exact: true }) })
        const prefix = kind === 'secundária' ? 'sec-' : ''
        if (kind === 'secundária') await section.getByRole('button', { name: 'Adicionar', exact: true }).click()
        const form = section.locator('form')
        await form.locator(`#${prefix}display-name`).fill('Alice Reserva')
        await form.locator(`#${prefix}label`).fill('Carteira de teste')
        await form.locator(`#${prefix}address`).fill(invalid.address)
        await form.locator(`#${prefix}network`).selectOption(invalid.network)
        const values = () => form.locator('input, select').evaluateAll(fields => fields.map(field => ({ id: field.id, value: (field as HTMLInputElement).value })))
        const draft = await values()
        const mutations: string[] = []
        page.on('request', request => {
          if (/^\/api\/wallets(?:\/|$)/.test(new URL(request.url()).pathname) && ['POST', 'PATCH'].includes(request.method())) mutations.push(request.url())
        })
        await form.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
        const field = form.locator(`#${prefix}${invalid.field}`)
        await expect(field).toHaveAttribute('aria-invalid', 'true')
        await expect(field).toHaveAttribute('aria-describedby', `${prefix}${invalid.field}-error`)
        await expect(form.locator(`#${prefix}${invalid.field}-error`)).toBeVisible()
        await expect(form.locator(`#${prefix}${invalid.field}-error`)).toHaveText(/\S/)
        await expect(field).toBeFocused()
        expect(await values()).toEqual(draft)
        expect(await readWallets(page)).toEqual(before)
        expect(mutations).toEqual([])
        await page.reload()
        await expect(page.locator('#label')).toHaveValue(before[0].label)
        await expect(page.getByText('Você ainda não adicionou uma carteira secundária.')).toBeVisible()
      })
    }
  }

  test('carteira secundária: cadastro e edição persistem sem duplicação', async ({ page }) => {
    await page.goto('/wallets')
    await expect(page.locator('#wallet-email')).toHaveValue('alice@kurio.dev')
    const before = await readWallets(page)
    expect(before).toHaveLength(1)
    const primary = before[0]
    const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Carteira secundária', exact: true }) })
    await section.getByRole('button', { name: 'Adicionar', exact: true }).click()
    const form = section.locator('form')
    await form.locator('#sec-display-name').fill('Alice Reserva')
    await form.locator('#sec-label').fill('Reserva Ethereum')
    await form.locator('#sec-address').fill(EVM_ADDRESS)
    await form.locator('#sec-network').selectOption('Ethereum')
    const created = page.waitForResponse(response => response.url().endsWith('/api/wallets') && response.request().method() === 'POST')
    await form.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
    const response = await created
    expect(response.status()).toBe(201)
    const wallet: Wallet = await response.json()
    expect(wallet).toMatchObject({ label: 'Reserva Ethereum', address: EVM_ADDRESS, network: 'Ethereum', isPrimary: false })
    await page.reload()
    await expect(form.locator('#sec-label')).toHaveValue('Reserva Ethereum')
    await expect(form.locator('#sec-address')).toHaveValue(EVM_ADDRESS)
    await expect(form.locator('#sec-network')).toHaveValue('Ethereum')
    const afterCreate = await readWallets(page)
    expect(afterCreate).toHaveLength(2)
    expect(afterCreate.find(item => item.id === primary.id)).toEqual(primary)
    expect(afterCreate.find(item => item.id === wallet.id)).toEqual(wallet)

    const editedAddress = '0x2222222222222222222222222222222222222222'
    await form.locator('#sec-label').fill('Reserva Polygon')
    await form.locator('#sec-address').fill(editedAddress)
    await form.locator('#sec-network').selectOption('Polygon')
    const updated = page.waitForResponse(result => result.url().endsWith(`/api/wallets/${wallet.id}`) && result.request().method() === 'PATCH')
    await form.getByRole('button', { name: 'Salvar carteira', exact: true }).click()
    expect((await updated).status()).toBe(200)
    await page.reload()
    await expect(form.locator('#sec-label')).toHaveValue('Reserva Polygon')
    await expect(form.locator('#sec-address')).toHaveValue(editedAddress)
    await expect(form.locator('#sec-network')).toHaveValue('Polygon')
    const afterEdit = await readWallets(page)
    expect(afterEdit).toHaveLength(2)
    expect(afterEdit.find(item => item.id === primary.id)).toEqual(primary)
    expect(afterEdit.find(item => item.id === wallet.id)).toMatchObject({ id: wallet.id, label: 'Reserva Polygon', address: editedAddress, network: 'Polygon', isPrimary: false })
  })

  test('senha e validação no perfil', async ({ page }) => {
    await page.goto('/profile')
    await page.locator('#new-password').fill('short')
    await page.locator('#confirm-password').fill('different')
    await page.locator('#current-password').fill('Alice123!')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(/Mínimo 8|não coincidem/i).first()).toBeVisible()

    await page.locator('#new-password').fill('AliceNew1!')
    await page.locator('#confirm-password').fill('AliceNew1!')
    await page.locator('#current-password').fill('Alice123!')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(/atualizado/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('avatar via upload', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('#email')).toHaveValue(/@/, { timeout: 10_000 })
    // 1×1 PNG — avoid multi‑MB data URLs blowing the mock store / request body
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    await page.locator('input[type="file"]').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: png,
    })
    await expect(page.locator('img[src^="data:"]').first()).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.locator('img[src^="data:"]').first()).toBeVisible({ timeout: 10_000 })
  })

})

test.describe('Login a11y (guest)', () => {
  test.beforeEach(async ({ page }) => {
    await resetMocks(page)
  })

  test('navegação por teclado e validação no login', async ({ page }) => {
    await openAuthEntry(page)
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('E-mail').focus()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('textbox', { name: 'Senha', exact: true })).toBeFocused()

    // Focus trap: Tab from last control cycles back into the dialog.
    await dialog.getByRole('button', { name: 'Fechar' }).focus()
    await page.keyboard.press('Tab')
    await expect(dialog.locator(':focus')).toBeVisible()
    const focusedOutside = await page.evaluate(() => {
      const dialogEl = document.querySelector('[role="dialog"]')
      return Boolean(document.activeElement && dialogEl && !dialogEl.contains(document.activeElement))
    })
    expect(focusedOutside).toBe(false)

    await dialog.getByRole('button', { name: 'Entrar' }).click()
    await expect(dialog.getByText(/Informe o e-mail/i)).toBeVisible()
    await expect(dialog.getByText(/Informe a senha/i)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  })
})

test('drawer mobile contém e devolve foco', async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1440) >= 768, 'Drawer existe somente no mobile')
  await resetMocks(page)
  const trigger = page.getByRole('button', { name: 'Abrir filtros' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator(':focus')).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.locator(':focus')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})


async function readWallets(page: Page): Promise<Wallet[]> {
  const token = await page.evaluate(() => localStorage.getItem('kurio:token'))
  const result = await api(page, '/wallets', 'GET', undefined, token!)
  expect(result.status).toBe(200)
  return result.data.items
}
