import { type Page, expect } from '@playwright/test'
import type { ScenarioId } from '../src/shared/api/types'

export async function resetMocks(page: Page) {
  await page.goto('/')
  await page.waitForFunction(() => Boolean(window.__KURIO_SET_SCENARIO__ && window.__KURIO_EMIT_NFT__))
  await page.evaluate(async () => {
    for (const key of Object.keys(localStorage)) if (key.startsWith('kurio:')) localStorage.removeItem(key)
    localStorage.setItem('kurio:deterministic', '1')
    await fetch('/api/dev/reset', { method: 'POST' })
  })
  await page.reload()
  await page.waitForFunction(() => Boolean(window.__KURIO_EMIT_NFT__))
  // Desktop/tablet: Kurio header · Mobile home: search (md:hidden still in DOM)
  await expect(
    page
      .getByRole('link', { name: 'Kurio' })
      .or(page.getByRole('searchbox', { name: 'Explorar coleções' }))
      .first(),
  ).toBeVisible({ timeout: 15_000 })
}

/** Mobile home uses dock Perfil; other mobile pages use hamburger; desktop uses header Entrar. */
export async function openAuthEntry(page: Page) {
  await expect(page.getByRole('button', { name: 'Entrar', exact: true }).or(page.getByRole('button', { name: 'Abrir menu' })).or(page.getByRole('button', { name: 'Perfil', exact: true })).locator('visible=true').first()).toBeVisible({ timeout: 15_000 })
  if (await page.getByRole('dialog').isVisible().catch(() => false)) return

  const menuBtn = page.getByRole('button', { name: 'Abrir menu' })
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click()
    await page.getByRole('navigation', { name: 'Mobile' }).getByRole('button', { name: 'Entrar' }).click()
    return
  }

  const entrar = page.getByRole('button', { name: 'Entrar' }).first()
  if (await entrar.isVisible().catch(() => false)) {
    await entrar.click()
    return
  }

  const dockProfile = page
    .getByRole('navigation', { name: 'Navegação inferior' })
    .getByRole('button', { name: 'Perfil' })
  if (await dockProfile.isVisible().catch(() => false)) {
    await dockProfile.click()
    return
  }

  await page.goto('/')
  if (await page.getByRole('dialog').isVisible().catch(() => false)) return
  const entrarHome = page.getByRole('button', { name: 'Entrar' }).first()
  if (await entrarHome.isVisible().catch(() => false)) {
    await entrarHome.click()
    return
  }
  await page
    .getByRole('navigation', { name: 'Navegação inferior' })
    .getByRole('button', { name: 'Perfil' })
    .click()
}

async function clickLogoutControl(page: Page) {
  const menuBtn = page.getByRole('button', { name: 'Abrir menu' })
  if (await menuBtn.isVisible().catch(() => false)) {
    await menuBtn.click()
    await page.getByRole('navigation', { name: 'Mobile' }).getByRole('button', { name: 'Sair' }).click()
    return
  }
  const headerSair = page.getByRole('banner').getByRole('button', { name: 'Sair' })
  if (await headerSair.isVisible().catch(() => false)) {
    await headerSair.click()
    return
  }
  // Mobile home: header hidden — go to profile (header returns) then logout
  const profileLink = page
    .getByRole('navigation', { name: 'Navegação inferior' })
    .getByRole('link', { name: 'Perfil' })
  if (await profileLink.isVisible().catch(() => false)) {
    await profileLink.click()
  } else {
    await page.goto('/profile')
  }
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('button', { name: 'Sair' }).click()
}

export async function clickLogout(page: Page) {
  await clickLogoutControl(page)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('kurio:token'))).toBeNull()
}

async function assertLoggedIn(page: Page) {
  await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 })
  await expect
    .poll(async () => page.evaluate(() => Boolean(localStorage.getItem('kurio:token'))))
    .toBe(true)
}

export async function loginAsAlice(page: Page) {
  await page.goto('/')
  await openAuthEntry(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('E-mail').fill('alice@kurio.dev')
  await dialog.getByRole('textbox', { name: 'Senha', exact: true }).fill('Alice123!')
  await dialog.getByRole('button', { name: 'Entrar' }).click()
  await assertLoggedIn(page)
}

export async function loginAsBob(page: Page) {
  await page.goto('/')
  await openAuthEntry(page)
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('E-mail').fill('bob@kurio.dev')
  await dialog.getByRole('textbox', { name: 'Senha', exact: true }).fill('Bob1234!')
  await dialog.getByRole('button', { name: 'Entrar' }).click()
  await assertLoggedIn(page)
}

function isMobileViewport(page: Page) {
  return (page.viewportSize()?.width ?? 1440) < 768
}

export async function openRegisterMode(page: Page) {
  const dialog = page.getByRole('dialog')
  if (isMobileViewport(page)) {
    await dialog.getByRole('button', { name: /Novo na Kurio\? Crie uma conta/i }).click()
  } else {
    await dialog.getByRole('tab', { name: 'Criar conta' }).click()
  }
}

export async function registerUniqueUser(page: Page) {
  const suffix = Date.now().toString(36)
  const email = `user_${suffix}@kurio.dev`
  const password = 'Test1234!'
  await page.goto('/')
  await openAuthEntry(page)
  const dialog = page.getByRole('dialog')
  await openRegisterMode(page)
  await dialog.getByLabel('Nome de usuário').fill(`User ${suffix}`)
  await dialog.getByLabel('E-mail').fill(email)
  await dialog.getByRole('textbox', { name: 'Senha', exact: true }).fill(password)
  await dialog.getByRole('textbox', { name: 'Confirmar senha' }).fill(password)
  const submitName = isMobileViewport(page) ? 'Criar perfil' : 'Criar conta'
  await dialog.getByRole('button', { name: submitName }).click()
  await assertLoggedIn(page)
  return { email, password }
}

export async function setScenario(page: Page, scenario: ScenarioId | string) {
  await page.evaluate((s) => {
    localStorage.setItem('kurio:scenario', s)
    window.__KURIO_SET_SCENARIO__?.(s as never)
  }, scenario)
}

export async function addNftToCart(page: Page, nftId = 'nft_001') {
  await page.goto(`/nfts/${nftId}`)
  await page.getByRole('button', { name: /^Comprar( NFT)?$/ }).locator('visible=true').click()
  await expect(page.getByRole('link', { name: /Carrinho com [1-9]/ })).toBeVisible({
    timeout: 15_000,
  })
}

export async function goCheckoutConnected(page: Page) {
  await page.goto('/checkout')
  const isMobile = (page.viewportSize()?.width ?? 1440) < 768
  if (isMobile) {
    await expect(page.getByRole('heading', { name: 'Pagamento com carteira' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  } else {
    await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible({
      timeout: 15_000,
    })
  }
  const name = page.locator('#display-name, #m-display-name').locator('visible=true')
  const username = page.locator('#username, #m-username').locator('visible=true')
  const email = page.locator('#email, #m-email').locator('visible=true')
  await expect(name).toBeVisible()
  await name.fill('Alice Colecionadora')
  await username.fill('alice')
  await email.fill('alice@kurio.dev')
  const profileName = page.locator('#profile-name, #m-profile-name').locator('visible=true')
  if (await profileName.count()) {
    const v = await profileName.inputValue()
    if (v.trim().length < 2) await profileName.fill('alice')
  }
  const address = page.locator('#wallet-address, #m-wallet-address').locator('visible=true')
  if (await address.count()) {
    const v = await address.inputValue()
    if (v.trim().length < 4) await address.fill('0xA11CE000000000000000000000000000000001')
  }
  await page.getByRole('radio').locator('visible=true').first().click()
  await page.getByRole('button', { name: 'Simular conexão' }).locator('visible=true').click()
  await expect(
    page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true'),
  ).toBeEnabled({ timeout: 10_000 })
}

export async function emitNftUpdated(
  page: Page,
  payload: { nftId: string; version: number; priceEth?: string; availableEditions?: number },
) {
  await page.evaluate((p) => {
    window.__KURIO_EMIT_NFT__?.(p.nftId, {
      version: p.version,
      priceEth: p.priceEth,
      available: p.availableEditions,
    })
  }, payload)
}

export async function emitOrderUpdated(
  page: Page,
  payload: { orderId: string; status: string; version?: number },
) {
  await page.evaluate((p) => {
    window.__KURIO_EMIT_ORDER__?.(p.orderId, { status: p.status as 'confirmed' | 'pending' | 'rejected', version: p.version })
  }, payload)
}

export async function disconnectSocket(page: Page) {
  await page.evaluate(() => {
    window.__KURIO_SOCKET__?.disconnect()
  })
}

export async function reconnectSocket(page: Page) {
  await page.evaluate(() => {
    window.__KURIO_SOCKET__?.connect()
  })
}
