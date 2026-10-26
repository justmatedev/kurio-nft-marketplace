# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: resilience.spec.ts >> rascunho na expiração só reaparece para o mesmo usuário
- Location: e2e/resilience.spec.ts:94:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Confirmar compra' }).visible()
    - locator resolved to <button type="button" class="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">Confirmar compra</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <li tabindex="0" data-index="0" data-front="true" data-styled="true" class="kurio-toast" data-mounted="true" data-swiped="false" data-visible="true" data-type="success" data-sonner-toast="" data-promise="false" data-removed="false" data-swiping="false" data-expanded="true" data-swipe-out="false" data-rich-colors="true" data-x-position="right" data-dismissible="true" data-y-position="bottom">…</li> from <section tabindex="-1" aria-live="polite" aria-atomic="false" aria-relevant="additions text" aria-label="Notifications alt+T" data-react-aria-top-layer="true">…</section> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <li tabindex="0" data-index="0" data-front="true" data-styled="true" class="kurio-toast" data-mounted="true" data-swiped="false" data-visible="true" data-type="success" data-sonner-toast="" data-promise="false" data-removed="false" data-swiping="false" data-expanded="true" data-swipe-out="false" data-rich-colors="true" data-x-position="right" data-dismissible="true" data-y-position="bottom">…</li> from <section tabindex="-1" aria-live="polite" aria-atomic="false" aria-relevant="additions text" aria-label="Notifications alt+T" data-react-aria-top-layer="true">…</section> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    37 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <li tabindex="0" data-index="0" data-front="true" data-styled="true" class="kurio-toast" data-mounted="true" data-swiped="false" data-visible="true" data-type="success" data-sonner-toast="" data-promise="false" data-removed="false" data-swiping="false" data-expanded="true" data-swipe-out="false" data-rich-colors="true" data-x-position="right" data-dismissible="true" data-y-position="bottom">…</li> from <section tabindex="-1" aria-live="polite" aria-atomic="false" aria-relevant="additions text" aria-label="Notifications alt+T" data-react-aria-top-layer="true">…</section> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
    - waiting for element to be visible, enabled and stable
    - element is not enabled
  - retrying click action
    - waiting 500ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic:
  - generic:
    - generic [aria-hidden]:
      - main:
        - generic:
          - generic:
            - generic:
              - generic:
                - searchbox
              - button
          - generic:
            - generic:
              - generic:
                - generic:
                  - paragraph: Bem-vindo à Kurio
                  - heading [level=1]: Seja dono da cultura digital
                  - paragraph: Descubra NFTs selecionados de criadores do mundo todo.
                  - button:
                    - text: Explorar
                    - generic [aria-hidden]: →
              - tablist:
                - tab
                - tab [selected]
                - tab
          - generic:
            - generic:
              - generic:
                - heading [level=2]: Catálogo de NFTs
                - generic:
                  - generic:
                    - button: Todos os NFTs
                    - button: Novos lançamentos
                    - button: Em alta
                - generic:
                  - generic:
                    - link:
                      - /url: /nfts/nft_028
                      - generic:
                        - heading [level=3]: "Ivory Baron #828"
                        - paragraph:
                          - generic: 0.08 ETH
                          - generic: 0.124 ETH
                    - button
                  - generic:
                    - link:
                      - /url: /nfts/nft_056
                      - generic:
                        - heading [level=3]: "Ivory Baron #856"
                        - paragraph:
                          - generic: 0.117 ETH
                          - generic: 0.181 ETH
                    - button
                  - generic:
                    - link:
                      - /url: /nfts/nft_084
                      - generic: Raro
                      - generic:
                        - heading [level=3]: "Ivory Baron #884"
                        - paragraph:
                          - generic: 0.154 ETH
                          - generic: 0.239 ETH
                    - button
                  - generic:
                    - link:
                      - /url: /nfts/nft_112
                      - generic:
                        - heading [level=3]: "Ivory Baron #912"
                        - paragraph:
                          - generic: 0.191 ETH
                          - generic: 0.296 ETH
                    - button
                  - generic:
                    - link:
                      - /url: /nfts/nft_140
                      - generic:
                        - heading [level=3]: "Ivory Baron #940"
                        - paragraph:
                          - generic: 0.228 ETH
                          - generic: 0.353 ETH
                    - button
                  - generic:
                    - link:
                      - /url: /nfts/nft_168
                      - generic: Raro
                      - generic:
                        - heading [level=3]: "Ivory Baron #968"
                        - paragraph:
                          - generic: 0.265 ETH
                          - generic: 0.411 ETH
                    - button
                  - generic:
                    - link:
                      - /url: /nfts/nft_196
                      - generic:
                        - heading [level=3]: "Ivory Baron #996"
                        - paragraph:
                          - generic: 0.302 ETH
                          - generic: 0.468 ETH
                    - button
                  - generic:
                    - link:
                      - /url: /nfts/nft_224
                      - generic:
                        - heading [level=3]: "Ivory Baron #1024"
                        - paragraph:
                          - generic: 0.339 ETH
                          - generic: 0.525 ETH
                    - button
                  - generic:
                    - link:
                      - /url: /nfts/nft_027
                      - generic: Raro
                      - generic:
                        - heading [level=3]: "Cosmic Bloom #827"
                        - paragraph:
                          - generic: 0.376 ETH
                    - button
                - navigation:
                  - button: "1"
                  - button: "2"
                  - button: "3"
                  - button: "4"
                  - button: "5"
                  - button: ›
          - generic:
            - generic:
              - generic:
                - generic:
                  - heading [level=2]: Lançamentos gênesis de edição limitada
                  - paragraph: Colecione edições escassas diretamente dos criadores antes da revelação pública.
                  - button: Explorar →
              - generic:
                - generic:
                  - heading [level=2]: Arte digital selecionada e muito mais
                  - paragraph: Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.
                  - button: Explorar →
          - generic:
            - generic:
              - generic:
                - heading [level=2]: Diário da Cunhagem
                - paragraph: Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
              - generic:
                - article:
                  - generic:
                    - paragraph: 12 de setembro | Leitura de 6 min
                    - heading [level=3]: Como funciona a propriedade de NFTs
                    - paragraph: Aprenda a colecionar, negociar e verificar ativos digitais.
                    - generic: Ler mais →
                - article:
                  - generic:
                    - paragraph: 13 de setembro | Leitura de 2 min
                    - heading [level=3]: 10 artistas digitais para acompanhar
                    - paragraph: Conheça criadores que moldam a cultura digital.
                    - generic: Ler mais →
                - article:
                  - generic:
                    - paragraph: 15 de setembro | Leitura de 3 min
                    - heading [level=3]: Raridade, atributos e procedência
                    - paragraph: Entenda raridade, procedência, direitos autorais e utilidade.
                    - generic: Ler mais →
                - article:
                  - generic:
                    - paragraph: 15 de setembro | Leitura de 2 min
                    - heading [level=3]: Como proteger sua carteira
                    - paragraph: Proteja sua carteira, seus ativos e sua identidade.
                    - generic: Ler mais →
      - navigation:
        - generic [ref=f4e1]:
          - generic [ref=f4e5]:
            - link [ref=f4e6] [cursor=pointer]:
              - /url: /
            - button [ref=f4e10]
            - link [ref=f4e13] [cursor=pointer]:
              - /url: /cart
            - button [ref=f4e19]
          - button [ref=f4e23]
      - contentinfo:
        - generic:
          - generic:
            - generic:
              - generic: W
              - generic:
                - paragraph: Segurança da carteira
                - paragraph: Proteja sua carteira e colecione arte digital verificada com confiança.
            - generic:
              - generic: C
              - generic:
                - paragraph: Criadores em destaque
                - paragraph: Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.
            - generic:
              - generic: D
              - generic:
                - paragraph: Alertas de lançamentos
                - paragraph: Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.
            - generic:
              - heading [level=2]: Antecipe-se ao próximo lançamento
              - generic:
                - generic:
                  - generic: E-mail
                  - textbox:
                    - /placeholder: digite seu e-mail...
                - button: Enviar
              - paragraph: Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
        - generic:
          - generic:
            - generic:
              - paragraph: Kurio
              - paragraph: Feito para colecionadores, criadores e cultura
            - generic:
              - paragraph: contato@email.com
              - paragraph: +55 11 4002 8922
        - generic:
          - generic:
            - paragraph: Meu perfil
            - list:
              - listitem: Meu perfil
              - listitem: Minha coleção
              - listitem: Atividade
              - listitem: Estúdio do criador
              - listitem: Lista de interesse
          - generic:
            - paragraph: Central de ajuda
            - list:
              - listitem: Central de ajuda
              - listitem: Como comprar NFTs
              - listitem: Carteira e segurança
              - listitem: Política do mercado
              - listitem: Denunciar item
          - generic:
            - paragraph: Coleções
            - list:
              - listitem: Arte digital
              - listitem: Fotografia
              - listitem: Música
              - listitem: Arte 3D
              - listitem: Utilidade
          - generic:
            - generic:
              - paragraph: Redes sociais
            - generic:
              - paragraph: Carteiras compatíveis
              - paragraph: METAMASK • WALLETCONNECT • COINBASE
        - generic:
          - paragraph: © 2026 Kurio. Propriedade digital para todos.
          - button: Resetar mocks
    - region "Notifications alt+T"
  - dialog [ref=f4e30]:
    - heading "Entrar" [level=2] [ref=f4e31]
    - button "Fechar" [active] [ref=f4e32]
    - generic [ref=f4e36]:
      - paragraph [ref=f4e37]: KURIO
      - paragraph [ref=f4e38]: Entrar
    - generic [ref=f4e39]:
      - generic [ref=f4e40]:
        - generic [ref=f4e41]: E-mail
        - textbox "E-mail" [ref=f4e42]:
          - /placeholder: contato@email.com
      - generic [ref=f4e43]:
        - generic [ref=f4e44]:
          - generic [ref=f4e45]: Senha
          - generic [ref=f4e46]:
            - textbox "Senha" [ref=f4e47]:
              - /placeholder: "***********"
            - button "Mostrar senha" [ref=f4e48]
        - button "Esqueceu a senha?" [ref=f4e55]
      - button "Entrar" [ref=f4e56]
    - generic [ref=f4e57]: Ou continue com
    - generic [ref=f4e61]:
      - button "Continuar com Google" [ref=f4e62]
      - button "Continuar com Facebook" [ref=f4e68]
    - button "Novo na Kurio? Crie uma conta" [ref=f4e72]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { api, setup } from './api'
  3   | import { resetMocks, loginAsAlice, loginAsBob, clickLogout, addNftToCart, goCheckoutConnected, setScenario } from './helpers'
  4   | 
  5   | test.beforeEach(async ({ page }) => { await resetMocks(page) })
  6   | 
  7   | test('mesma chave em duas contas cria pedidos independentes; carteira alheia é proibida', async ({ page }) => {
  8   |   const { alice, bob, body } = await setup(page)
  9   |   const headers = { 'Idempotency-Key': 'shared' }
  10  |   expect((await api(page, '/cart', 'GET', undefined, undefined, { 'X-Guest-Id': alice.user.id })).data.items).toHaveLength(0)
  11  |   expect((await api(page, '/orders', 'POST', { ...body, walletId: 'wal_bob_1' }, alice.token, headers)).status).toBe(403)
  12  |   expect((await api(page, '/orders', 'POST', { ...body, network: 'Solana' }, alice.token, headers)).status).toBe(403)
  13  |   const first = (await api(page, '/orders', 'POST', body, alice.token, headers)).data
  14  |   await api(page, '/cart/items', 'POST', { nftId: 'nft_002', editionId: 'ed_002_50', quantity: 1 }, bob.token)
  15  |   const wallets = (await api(page, '/wallets', 'GET', undefined, bob.token)).data.items
  16  |   const wallet = wallets[0]
  17  |   const quote = (await api(page, '/quote', 'POST', { walletId: wallet.id, network: wallet.network }, bob.token)).data
  18  |   const second = await api(page, '/orders', 'POST', { ...body, quoteId: quote.quoteId, walletId: wallet.id, network: wallet.network, collectorEmail: bob.user.email }, bob.token, headers)
  19  |   expect(second.status).toBe(201)
  20  |   expect(second.data.id).not.toBe(first.id)
  21  | })
  22  | 
  23  | test('revisão exige aceite mesmo após desfazer quantidade; cotação vence por relógio', async ({ page }) => {
  24  |   const { alice, body } = await setup(page)
  25  |   const cart = (await api(page, '/cart', 'GET', undefined, alice.token)).data
  26  |   for (const quantity of [2, 1]) await api(page, `/cart/items/${cart.items[0].id}`, 'PATCH', { quantity }, alice.token)
  27  |   expect((await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'revision' })).data.code).toBe('QUOTE_CHANGED')
  28  |   const quote = (await api(page, '/quote', 'POST', { walletId: body.walletId, network: body.network }, alice.token)).data
  29  |   await page.clock.setFixedTime(new Date(new Date(quote.expiresAt).getTime() + 1))
  30  |   expect((await api(page, '/orders', 'POST', { ...body, quoteId: quote.quoteId }, alice.token, { 'Idempotency-Key': 'expired' })).data.code).toBe('QUOTE_CHANGED')
  31  | })
  32  | 
  33  | test('cupom expira entre revisão e compra', async ({ page }) => {
  34  |   const { alice, body } = await setup(page)
  35  |   const quote = (await api(page, '/quote', 'POST', { walletId: body.walletId, network: body.network, couponCode: 'MINT10' }, alice.token)).data
  36  |   const result = await api(page, '/orders', 'POST', { ...body, quoteId: quote.quoteId }, alice.token, { 'Idempotency-Key': 'coupon', 'X-Kurio-Scenario': 'coupon-expired' })
  37  |   expect(result.data.code).toBe('QUOTE_CHANGED')
  38  |   expect((await api(page, '/orders/attempts/coupon', 'GET', undefined, alice.token)).status).toBe(404)
  39  | })
  40  | 
  41  | test('reserva é liberada uma vez na recusa; confirmação subtrai apenas quantidade comprada', async ({ page }) => {
  42  |   const { alice, body } = await setup(page)
  43  |   const stock = async () => (await api(page, '/nfts/nft_001')).data.editions.find((e: { id: string }) => e.id === 'ed_001_50').available
  44  |   const initial = await stock()
  45  |   const order = (await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'reserve' })).data
  46  |   expect(await stock()).toBe(initial - 1)
  47  |   for (let i = 0; i < 2; i++) await api(page, '/dev/emit-order', 'POST', { orderId: order.id, overrides: { status: 'rejected' } })
  48  |   expect(await stock()).toBe(initial)
  49  |   const quote = (await api(page, '/quote', 'POST', { walletId: body.walletId, network: body.network }, alice.token)).data
  50  |   const next = (await api(page, '/orders', 'POST', { ...body, quoteId: quote.quoteId }, alice.token, { 'Idempotency-Key': 'consume' })).data
  51  |   const cart = (await api(page, '/cart', 'GET', undefined, alice.token)).data
  52  |   await api(page, `/cart/items/${cart.items[0].id}`, 'PATCH', { quantity: 3 }, alice.token)
  53  |   await api(page, '/dev/emit-order', 'POST', { orderId: next.id, overrides: { status: 'confirmed' } })
  54  |   expect((await api(page, '/cart', 'GET', undefined, alice.token)).data.items[0].quantity).toBe(2)
  55  |   expect(await stock()).toBe(initial - 1)
  56  | })
  57  | 
  58  | test('socket de Bob não recebe evento privado de Alice', async ({ page }) => {
  59  |   await loginAsBob(page)
  60  |   await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(true)
  61  |   await page.evaluate(() => {
  62  |     const socket = window.__KURIO_SOCKET__ as unknown as { on: (name: string, fn: () => void) => void }
  63  |     socket.on('order.updated', () => document.body.dataset.privateEvent = 'received')
  64  |   })
  65  |   const { alice, body } = await setup(page)
  66  |   const order = (await api(page, '/orders', 'POST', body, alice.token, { 'Idempotency-Key': 'private' })).data
  67  |   await api(page, '/dev/emit-order', 'POST', { orderId: order.id, overrides: { status: 'confirmed' } })
  68  |   expect(await page.locator('body').getAttribute('data-private-event')).toBeNull()
  69  |   await expect(page.getByText('Pedido confirmado', { exact: true })).toHaveCount(0)
  70  | })
  71  | 
  72  | test('conexão indisponível recupera por Socket.IO ao reconectar', async ({ page }) => {
  73  |   await setScenario(page, 'socket-unavailable')
  74  |   await page.goto('/nfts/nft_001')
  75  |   await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  76  |   await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(false)
  77  |   await setScenario(page, 'default')
  78  |   await page.evaluate(() => { window.__KURIO_SOCKET__?.disconnect(); window.__KURIO_SOCKET__?.connect() })
  79  |   await expect.poll(() => page.evaluate(() => window.__KURIO_SOCKET__?.connected)).toBe(true)
  80  | })
  81  | 
  82  | test('falha transitória preserva sessão e permite retry', async ({ page }) => {
  83  |   await loginAsAlice(page)
  84  |   const token = await page.evaluate(() => localStorage.getItem('kurio:token'))
  85  |   await setScenario(page, 'network-error')
  86  |   await page.goto('/profile')
  87  |   await expect(page.getByRole('alert')).toBeVisible()
  88  |   expect(await page.evaluate(() => localStorage.getItem('kurio:token'))).toBe(token)
  89  |   await setScenario(page, 'default')
  90  |   await page.getByRole('button', { name: 'Tentar novamente' }).click()
  91  |   await expect(page.locator('#email')).toHaveValue('alice@kurio.dev')
  92  | })
  93  | 
  94  | test('rascunho na expiração só reaparece para o mesmo usuário', async ({ page }) => {
  95  |   await addNftToCart(page)
  96  |   await loginAsAlice(page)
  97  |   await goCheckoutConnected(page)
  98  |   await page.locator('#display-name, #m-display-name').locator('visible=true').fill('Alice Rascunho')
  99  |   await setScenario(page, 'session-expired')
> 100 |   await page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true').click()
      |                                                                                        ^ Error: locator.click: Test timeout of 60000ms exceeded.
  101 |   await expect(page.getByRole('dialog')).toBeVisible()
  102 |   await page.keyboard.press('Escape')
  103 |   await setScenario(page, 'default')
  104 |   await loginAsBob(page)
  105 |   await page.goto('/checkout')
  106 |   await expect(page.getByText('Carrinho vazio.', { exact: false })).toBeVisible()
  107 |   await clickLogout(page)
  108 |   await loginAsAlice(page)
  109 |   await page.goto('/checkout')
  110 |   // The exact persisted attempt is recovered after login; the collector snapshot is retained.
  111 |   await expect(page).toHaveURL(/orders\//)
  112 |   await expect(page.getByText('Alice Rascunho', { exact: true })).toBeVisible({ timeout: 15_000 })
  113 | })
  114 | 
  115 | test('busca com respostas fora de ordem mantém o filtro mais recente', async ({ page }) => {
  116 |   await setScenario(page, 'out-of-order')
  117 |   await page.goto('/')
  118 |   await expect(page.locator('#catalogo h3').first()).toBeVisible()
  119 |   const headerSearch = page.getByRole('button', { name: 'Buscar NFTs' })
  120 |   if (await headerSearch.isVisible()) await headerSearch.click()
  121 |   const search = page.getByRole('searchbox').locator('visible=true').first()
  122 |   const older = page.waitForRequest(req => req.url().includes('/api/nfts?') && req.url().includes('q=Ape'))
  123 |   await search.fill('Ape')
  124 |   await older
  125 |   await search.fill('Violet')
  126 |   await expect(page).toHaveURL(/q=Violet/)
  127 |   await expect(page.locator('#catalogo h3').first()).toContainText('Violet')
  128 |   await page.waitForTimeout(1300) // Explicit scenario: the older request completes at 1200 ms.
  129 |   await expect(page.locator('#catalogo h3').first()).toContainText('Violet')
  130 | })
  131 | 
  132 | test('checkout mantém campos e foco com zoom de 200%', async ({ page }) => {
  133 |   await addNftToCart(page)
  134 |   await loginAsAlice(page)
  135 |   await goCheckoutConnected(page)
  136 |   const viewport = page.viewportSize()!
  137 |   // Browser zoom halves the CSS layout viewport. Keep that reflow constraint reproducible.
  138 |   await page.setViewportSize({ width: Math.floor(viewport.width / 2), height: Math.floor(viewport.height / 2) })
  139 |   const name = page.locator('#display-name, #m-display-name').locator('visible=true')
  140 |   await name.fill('')
  141 |   await page.getByRole('button', { name: 'Confirmar compra' }).locator('visible=true').click()
  142 |   await expect(name).toBeFocused()
  143 |   await expect(name).toHaveAttribute('aria-describedby', /error/)
  144 |   await expect(page.getByText('Mínimo 2 caracteres').locator('visible=true')).toBeVisible()
  145 |   const notes = page.locator('#notes, #m-notes').locator('visible=true')
  146 |   await notes.fill('Conteúdo preservado')
  147 |   await notes.scrollIntoViewIfNeeded()
  148 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  149 |   await expect(notes).toHaveValue('Conteúdo preservado')
  150 | })
  151 | 
```