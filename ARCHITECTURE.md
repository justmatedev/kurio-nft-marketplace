# Arquitetura — Kurio

## Fronteiras

A interface usa TanStack Router/Query, Axios e `socket.io-client`. MSW intercepta REST/WebSocket; handlers validam transporte e autorização, `mockStore` mantém operações de domínio e persistência, e `mocks/events.ts` registra/publica snapshots. O domínio não importa handlers Socket.IO nem React.

```text
UI → Query → Axios → MSW REST → domínio → persistência
                                      ↓
                             evento versionado
                                      ↓
                       binding MSW Socket.IO
                                      ↓
                         socket.io-client → UI
                                      ↓
                         reconciliação REST
```

A estrutura React e os skeletons renderizam imediatamente. Axios e a inicialização do socket aguardam `networkReady`, resolvido após `worker.start()`. A falha de rede é exibida sem inventar dados. O cliente Socket.IO é importado depois de a interceptação estar pronta; chunks de parsers e cliente são separados para evitar capturar o WebSocket nativo antes do MSW.

## REST (`/api`)

| Método | Recurso | Contrato |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Dados validados; retorna `{token,user,expiresAt,cartAdjustments?}`; ambos fazem merge guest |
| GET / POST | `/auth/session`, `/auth/logout` | Consulta/revogação do token |
| GET | `/nfts` | `q`, `collection`, `network`, preços, sort, page, pageSize; resposta paginada |
| GET | `/catalog/meta` | Contagens e quatro destaques, evitando baixar todo o catálogo para filtros |
| GET | `/nfts/:id` | NFT e versão; 404 para ausente |
| GET / POST / DELETE | `/favorites`, `/favorites/:nftId` | Autenticado e isolado por usuário |
| GET / POST / PATCH / DELETE | `/cart`, `/cart/items`, `/cart/items/:id` | Usuário autenticado ou identificador `guest_*`; `revision` cresce nas edições |
| POST | `/quote` | `{couponCode?,walletId?,network?}` → `quoteId`, revisão, validade, itens, disponibilidade, cupom, descontos, taxa e total |
| POST | `/orders` | Bearer + `Idempotency-Key`; `{quoteId,collectorName,collectorEmail,collectorUsername?,notes?,walletId,network}` |
| GET | `/orders/attempts/:key` | Recupera tentativa somente do usuário autenticado; 404 se não existe |
| GET | `/orders/:id` | 403 sem dados do recurso se pertence a outro usuário |
| GET / PATCH | `/profile` | Perfil da sessão, campos permitidos e validados |
| POST | `/profile/password` | `{currentPassword,newPassword}` |
| GET / POST / PATCH | `/wallets`, `/wallets/:id` | Carteiras da sessão, endereço/rede validados; 404 para carteira alheia/ausente |

Erros: `{code,message,fields?}`. Códigos: `VALIDATION`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `QUOTE_CHANGED`, `GONE`, `TRANSIENT`, `IDEMPOTENCY_CONFLICT`. Quantidades são inteiros positivos; ETH permanece string decimal, com Decimal.js (40 dígitos de precisão). A formatação mantém todas as casas significativas; o parâmetro de casas define apenas o mínimo visual.

## Cotação, estoque e idempotência

Cotações duram cinco minutos e persistem dono, snapshot e vínculo com o pedido. Sua revisão considera revisão do carrinho, linhas/edições/quantidades, preços, disponibilidade, cupom/validade/desconto, taxa e dados da carteira/rede. Revisões diferentes exigem aceite mesmo com total igual; o aceite é vinculado ao `quoteId`. Carteira/rede devem pertencer à sessão; alterações editadas precisam ser salvas antes de reconectar/revisar.

Criação revalida a cotação aceita contra o domínio atual. A chave é indexada por `(userId, chave)` e o corpo normalizado é comparado **antes** de revalidar carrinho/cotação. Mesmo corpo recupera o pedido; corpo diferente retorna 409. Uma cotação gera no máximo um pedido.

A criação reserva estoque sincronamente: `available` significa estoque livre. Pedido pendente + suas linhas + `settlements` representam a reserva persistida, resultado previsto e prazo. Confirmação consome a reserva sem nova baixa; recusa devolve a quantidade. Estados terminais não são reaplicados. A confirmação subtrai apenas a quantidade comprada da linha/edição original; uma linha removida e readicionada tem identidade nova. Mutações em catálogo sempre incrementam versão e produzem `nft.updated` após persistir.

Timers agilizam a conclusão, mas não são a fonte de verdade: carregar o store ou consultar REST reconcilia prazos vencidos. O recibo contém nome, e-mail, observações, carteira e itens/preços congelados; não consulta catálogo ou carteira atual para reconstruir a compra.

Antes do envio, `kurio:attempt:<userId>` guarda chave, corpo exato e ID conhecido. Timeout provoca consulta por chave e refresh retoma a mesma tentativa. Erros definitivos liberam a tentativa para nova revisão; erros de conexão/401 a preservam. O rascunho `sessionStorage/kurio:checkout:<userId>` conserva campos por conta. Uma conta diferente não retoma essa tentativa. Conclusão terminal limpa tentativa/rascunho correspondente.

## Sessão e cache

Token opaco em `kurio:token`; senha fictícia em hash SHA-256 no store. As queries privadas incluem o dono; carrinho inclui usuário/guest. `AbortSignal` chega ao Axios. A resposta 401 só invalida a sessão que originou a requisição; falha transitória não apaga token. Rotas privadas usam `beforeLoad` e retry de erro de conexão, com redirect preservado quando autenticação é necessária.

Trocar sessão cancela queries, remove caches privados, desmonta a árvore vinculada ao token e desconecta listeners. Callbacks de mutations verificam a sessão de origem. Contexto novo não reutiliza formulários/subscriptions da conta antiga. Login/cadastro combinam linhas por NFT/edição, recalculam preços/estoque e comunicam ajustes.

Queries têm staleTime de 15 s e um retry; sessão não repete automaticamente; mutations têm zero retries. Favoritos usam atualização otimista/rollback. Pedidos pendentes fazem polling a cada 1500 ms como recuperação REST. Esse polling não é usado como evidência de entrega do socket: testes próprios verificam conexão, desconexão, evento recebido e replay no detalhe.

## Socket.IO

`ws.link` intercepta o transporte WebSocket e `@mswjs/socket.io-binding` codifica eventos. MSW 2.15 normaliza `/socket.io/` para o namespace raiz ao fazer matching; o handler cobre ambos os caminhos. O cliente envia `auth.token`; a conexão só é registrada para eventos privados depois da validação. Heartbeat de 20 s exige pong em 5 s; close remove listeners e timers. Não há listener BroadcastChannel na aplicação nem caminho direto para setters/cache.

| Evento | Campos | Efeito |
| --- | --- | --- |
| `nft.updated` | `eventId,type,id,version,editionId,priceEth,available,at` | Invalida catálogo, detalhe, carrinho e cotação |
| `order.updated` | `eventId,type,id,userId,version,status,txRef,rejectionReason,at` | Filtrado pelo dono na origem; reconcilia REST autenticado antes da confirmação visual |

Versão recebida é comparada com eventos anteriores e versões REST conhecidas; eventId repetido é ignorado. Reconexão invalida catálogo, detalhes ativos, carrinho, cotação e pedidos. Replay usa apenas eventos já produzidos; o controle de testes não inventa confirmação divergente do store.

Limites: somente namespace padrão e transporte WebSocket; não há fallback Engine.IO por HTTP polling, servidor externo ou sincronização transacional entre abas independentes. O store roda na página (não dentro do Service Worker) e persiste no localStorage. É uma demonstração com uma instância ativa de domínio por aba. Arquivos e endpoints `dev` existem apenas com mocks habilitados.

## Persistência e reset

Schema 3 engloba catálogo, contas, sessões, carrinhos, carteiras, favoritos, cotações, pedidos, índice idempotente e metadados das reservas. Fixtures são restauradas no primeiro uso, incompatibilidade de schema ou reset explícito. Refresh não sobrescreve preços/estoque/versões. Dados de schemas incompatíveis são descartados; a limpeza só alcança chaves `kurio:`. Reset limpa estados, reservas, timers e histórico de eventos, preservando a flag determinística dos testes.

## Interface e validação

Schemas compartilhados em `shared/api/validation.ts` validam formulários e handlers. Skeletons mantêm áreas de conteúdo; erros iniciais oferecem retry e erros em segundo plano preservam dados. Mensagens usam roles/aria-describedby e foco no primeiro campo inválido. Login, filtros e navegação mobile usam Radix Dialog para foco inicial, contenção, Escape e restauração. O checkout mobile mantém o formulário do colecionador; resumo participa do fluxo e não depende de altura fixa sobre os campos. Notificações ficam no topo para não bloquear os controles de aceite/compra no fim do checkout.

Imagens WebP em variantes de 640/960 px ficam em `public/nfts`; a fonte Roboto Mono também é servida localmente. As imagens foram convertidas de exports PNG para reduzir transferência. Decisões de interface: preços exibem todas as casas significativas; checkout mostra dados do colecionador e explica revisão; recibo identifica compra simulada. As oito baselines e suas evidências são descritas em [VALIDACAO.md](docs/VALIDACAO.md).

## Validação e performance

Consulte os [resultados de validação](docs/VALIDACAO.md) e o [relatório Lighthouse](lighthouse/reports/README.md) para métricas e limitações. Lighthouse usa build real, imagens/fontes/Socket.IO/MSW habilitados, perfis novos a cada execução, mobile Slow 4G e desktop Dense 4G. Há três execuções por combinação, HTML/JSON individuais e medianas com versões/ambiente. Chromium é encontrado pela instalação do Playwright; CHROME_PATH permite override.
