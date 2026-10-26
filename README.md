# Kurio

Marketplace de NFTs desenvolvido como solução para o desafio técnico de Frontend da Jungle Gaming.

[Demonstração online](https://kurio-nft-marketplace-jg.vercel.app/) · [Repositório](https://github.com/justmatedev/kurio-nft-marketplace)

O projeto utiliza React/TypeScript, Vite, TanStack Router/Query, Axios, Socket.IO, Tailwind, componentes shadcn/ui/Radix, MSW, Playwright e Lighthouse. Compras, carteiras, transações e autenticação são simuladas; não há integração com blockchain ou pagamentos reais.

## Execução local

```bash
npm ci
npx playwright install chromium
cp .env.example .env
npm run dev
```

Abra `http://localhost:5173`. As variáveis públicas estão em [`.env.example`](.env.example). `VITE_ENABLE_MSW=true` habilita os mocks também no build; `false` exige uma API/Socket.IO compatível. `VITE_API_BASE_URL=/api`, `VITE_SOCKET_URL=/` e `VITE_DEFAULT_SCENARIO=default` são os padrões da demonstração.

## Contas fictícias

| Conta | E-mail | Senha |
| --- | --- | --- |
| Alice | `alice@kurio.dev` | `Alice123!` |
| Bob | `bob@kurio.dev` | `Bob1234!` |

Senhas são hashes SHA-256 no mock, nunca persistidas em claro. Isso é uma simulação local, não um serviço de autenticação para produção. Cupom válido: `MINT10`; expirado: `EXPIRED`.

## Persistência, compra e reset

O schema 3 (`kurio:mock-store-v3`) persiste catálogo, contas, sessões, carrinhos, carteiras, favoritos, cotações, pedidos e reservas pendentes. A atualização do schema antigo descarta os dados fictícios antigos uma única vez. Refresh conserva os dados novos, inclusive estoque/preços e o resultado previsto de pedidos pendentes. Somente chaves `kurio:` são removidas no reset.

Use **Resetar mocks** no rodapé, `window.__KURIO_RESET__()` seguido de refresh, ou `POST /api/dev/reset`. O reset também cancela timers de processamento, limpa histórico de eventos e cenários. Testes usam contextos independentes.

No checkout, salve explicitamente alterações na carteira e selecione **Simular conexão**. Mudanças de condições da cotação exibem as diferenças e exigem **Aceitar novos valores**. Cupom inválido ou estoque insuficiente bloqueiam a confirmação. A tentativa é salva por usuário antes do envio; timeout ou refresh recupera a mesma chave/corpo, sem duplicar o pedido. Login e cadastro incorporam o carrinho visitante e avisam se estoque/preço exigiram ajustes.

## Cenários reproduzíveis

Selecione `?scenario=nome` ou execute `window.__KURIO_SET_SCENARIO__('nome')` no console. A URL prevalece sobre o valor salvo. `kurio:deterministic=1` fixa as latências comuns (50 ms; `slow`: 2 s). Os E2E ativam esse modo.

| Cenário | Como reproduzir |
| --- | --- |
| `default`, `empty` | Abrir catálogo normal/vazio |
| `slow` | Recarregar catálogo, perfil ou carteiras e observar skeletons |
| `flaky` | 503 aleatório fora do modo determinístico; usar `catalog-error` nos testes de retry |
| `catalog-error`, `favorites-fail` | Falha 503 na lista ou na mutation de favoritos; voltar a `default` e tentar novamente |
| `network-error` | Falha de conexão REST; token permanece salvo, há retry |
| `socket-unavailable` | Recarregar sem conexão Socket.IO; voltar a `default` e reconectar |
| `out-of-order` | Buscar `Ape` (1200 ms), depois `Violet` (50 ms); filtro mais recente prevalece |
| `session-expired` | Durante checkout, confirmar; autenticar novamente em `default` para retomar a mesma conta |
| `coupon-invalid`, `coupon-expired` | Aplicar/revalidar `MINT10`; compra bloqueada |
| `price-changed`, `sold-out` | Abrir checkout com um item: após 800 ms o store altera preço/estoque e emite evento real |
| `order-timeout` | Confirmar: pedido persiste, primeira resposta demora 9500 ms (Axios: 8000 ms); recuperação encontra o pedido, settlement em 12 s |
| `payment-rejected` | Confirmar: reserva liberada e carrinho preservado na recusa |

Controles de dados ficam na camada de mocks: `__KURIO_EMIT_NFT__(id, {editionId, priceEth, available})` persiste a alteração antes de emitir; `__KURIO_EMIT_ORDER__(id, {status})` conclui o pedido no domínio (estados terminais não mudam). `GET /api/dev/events` lista eventos produzidos e `POST /api/dev/replay` com `{eventId}` repete um deles. Não existe entrega alternativa à UI por BroadcastChannel. `__KURIO_SOCKET__` expõe a conexão real para desconectar/reconectar nos testes.

## Comandos e evidências

| Comando | Resultado |
| --- | --- |
| `npm run build` / `npm run preview` | Build e preview de produção |
| `npm run typecheck` / `npm run lint` | TypeScript e Oxlint |
| `npm run test:unit` | Senhas, precisão ETH e schemas compartilhados |
| `npm run test:e2e` | Chromium em 1440, 768 e 390 px, sem retries; oito baselines desktop/mobile |
| `npm run lighthouse` | 12 medições: início/detalhe × mobile/desktop × três execuções |

Playwright grava `playwright-report/<execução>` e `test-results/<execução>` (traces nas falhas). `KURIO_TEST_RUN` define um identificador; `PLAYWRIGHT_HTML_OUTPUT_DIR` e `--output` permitem destinos específicos. Se um preview já estiver ativo na porta 4173, execute `npm run build` antes dos testes.

Lighthouse encontra Chromium pela instalação do Playwright. `CHROME_PATH` é um override opcional. HTML/JSON individuais e medianas estão em [`lighthouse/reports/latest`](lighthouse/reports/latest/summary.json). `LIGHTHOUSE_OUTPUT_DIR`, `LIGHTHOUSE_PAGE=home|detail` e `LIGHTHOUSE_RUNS` permitem diagnósticos isolados; a execução de entrega usa os padrões (12 auditorias).

Consulte [arquitetura e contratos](ARCHITECTURE.md) e [resultados de validação](docs/VALIDACAO.md).

## Publicação

A demonstração está disponível em [kurio-nft-marketplace-jg.vercel.app](https://kurio-nft-marketplace-jg.vercel.app/). O `vercel.json` configura o rewrite SPA. Métricas e pendências de performance estão em [VALIDACAO.md](docs/VALIDACAO.md).
