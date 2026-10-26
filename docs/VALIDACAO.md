# Validação — Kurio

Resultados registrados em **25/10/2026**, em ambiente local com mocks habilitados. Este documento reúne verificações de código, cobertura funcional, regressão visual e métricas de qualidade. As limitações conhecidas estão indicadas junto aos resultados.

## Código e instalação

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Build de produção | Aprovado | [Log](evidencias/playwright-gaps-checks/build.log) |
| TypeScript | Sem erros | [Log](evidencias/playwright-gaps-checks/typecheck.log) |
| Oxlint | Sem erros; 52 warnings | [Log](evidencias/playwright-gaps-checks/lint.log) |
| Testes unitários | 7 aprovados | [Log](evidencias/playwright-gaps-checks/unit.log) |
| Instalação limpa | `npm ci --no-audit --no-fund`: 344 pacotes instalados | [Log](evidencias/checks/clean-install.log) |
| Build após instalação limpa | Aprovado | [Log](evidencias/checks/clean-build.log) |

A instalação foi validada em diretório independente, usando o lockfile e `.env.example`, sem reutilizar `node_modules` ou configuração privada. A política `allowScripts` do ambiente bloqueou o postinstall opcional do MSW; o worker incluído em `public/` permitiu executar o build normalmente.

Os warnings do lint incluem Fast Refresh e dependências/efeitos React. Os unitários cobrem senhas fictícias, schemas compartilhados e precisão decimal de ETH. [Versões das ferramentas e identificação das fontes verificadas](evidencias/playwright-gaps-checks/environment.json).

## Playwright

**177 testes aprovados, zero falhas, zero flaky e duas exclusões intencionais**, em 7,7 minutos. Execução em Chromium, com um worker e **zero retries**.

| Projeto | Viewport | Aprovados | Excluídos | Falhas |
| --- | --- | ---: | ---: | ---: |
| Desktop | 1440×900 | 60 | 1 | 0 |
| Tablet | 768×1024 | 56 | 1 | 0 |
| Mobile | 390×844 | 61 | 0 | 0 |

As duas exclusões correspondem ao teste do drawer mobile nos projetos desktop e tablet, onde esse controle não existe.

Evidências: [relatório HTML](evidencias/playwright-gaps-full-20261025T233514Z/report/index.html), [resultado JSON](evidencias/playwright-gaps-full-20261025T233514Z/results.json) e [log da execução](evidencias/playwright-gaps-full-20261025T233514Z/execution.log).

### Cobertura

- Catálogo: busca, filtros combinados, ordenação, paginação, histórico, refresh, acesso direto e recurso inexistente.
- Conta: cadastro, login, logout, troca de usuário, expiração de sessão, perfil, avatar e senha.
- Carteiras: validação de endereço/rede nos formulários principal e secundário; foco e mensagens acessíveis; cadastro/edição com persistência, identidade estável e ausência de duplicação.
- Carrinho e favoritos: quantidades, edição, remoção, cupom, merge no login/cadastro, atualização otimista e rollback.
- Compra: revisão/expiração da cotação, mudança de preço e taxa mantendo o total, cupom expirado, reserva de estoque, confirmação, recusa e recibo imutável.
- Recuperação: timeout superior aos oito segundos do Axios, clique repetido, tentativa persistida, refresh durante processamento e retomada restrita à mesma conta.
- Isolamento: pedidos e carteiras alheios, idempotência por usuário, limpeza de contexto e filtragem de eventos privados.
- Socket.IO: recebimento pelo cliente, desconexão/reconexão, replay, eventos antigos/duplicados e esgotamento/reposição durante o checkout. Estoque insuficiente bloqueia a compra mesmo após aceite; reposição exige nova revisão.
- Interface: respostas fora de ordem, falha/retry, skeletons, teclado, foco em diálogos/drawers e reflow do checkout.

Os testes partem de estados isolados e usam latências determinísticas. Relógio controlado é aplicado aos cenários de expiração, processamento após refresh e screenshots; o timeout HTTP é medido em tempo real. Requisições REST passam pelos handlers MSW, e eventos de tempo real percorrem o cliente Socket.IO.

Relatórios usam diretórios próprios por execução. A configuração `retain-on-failure` preserva traces nas falhas; a execução aprovada não produziu novos traces. [Traces de falhas corrigidas](evidencias/e2e-20261025T213445Z/traces) e seu [registro de diagnóstico](evidencias/e2e-20261025T213445Z/results.json) estão disponíveis para inspeção.

### Regressão visual e acessibilidade

As **oito baselines** de início, detalhe, carrinho e pagamento em desktop/mobile passaram sem atualização durante a execução. As capturas aguardam consultas, fontes e imagens; o primeiro slide do carrossel é fixado pelo relógio. A tolerância configurada é `maxDiffPixelRatio: 0.05`. [Hashes das baselines](evidencias/playwright-gaps-checks/baselines-sha256.json).

Os testes verificam associação de erros aos campos, foco, preservação de rascunhos e navegação por teclado. O reflow do checkout usa viewport CSS reduzido à metade, equivalente à área disponível em zoom de 200%, e verifica ausência de overflow horizontal.

## Lighthouse

Foram executadas **12 auditorias válidas**: três medições por combinação de início/detalhe e mobile/desktop. Cada medição usou perfil Chromium novo, build de produção e cenário padrão, com imagens, fontes, MSW e Socket.IO habilitados. As categorias e métricas abaixo são medianas independentes.

| Página / perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início / mobile | 74 | 100 | 100 | 92 | 5132 ms | 0,0000 | 53 ms |
| Início / desktop | 98 | 100 | 100 | 92 | 1025 ms | ≈0,0000 | 0 ms |
| Detalhe / mobile | 78 | 100 | 100 | 92 | 4451 ms | 0,0329 | 43 ms |
| Detalhe / desktop | 95 | 97 | 100 | 92 | 954 ms | 0,1160 | 0 ms |

Accessibility ≥95, Best Practices ≥95 e SEO ≥90 foram atingidos nos quatro alvos. **Performance mobile permanece abaixo da meta de 90** nas duas páginas. Carregamento inicial do runtime MSW, JavaScript, consultas e imagens contribuem para o LCP. O detalhe desktop ainda apresenta deslocamento do rodapé, com CLS mediano ≈0,116.

Ambiente, throttling, versões, análise e HTML/JSON individuais estão no [relatório Lighthouse](../lighthouse/reports/README.md) e no [resumo estruturado](../lighthouse/reports/latest/summary.json). A série antecede o reposicionamento dos toasts, ausentes na carga inicial das páginas auditadas.

## Reprodução

Após o [setup local](../README.md#execução-local):

```bash
npm run build
npm run typecheck
npm run lint
npm run test:unit
npm run test:e2e
npm run lighthouse
```

Execute Playwright e Lighthouse separadamente para evitar concorrência entre navegadores durante a medição. Caso exista um preview ativo na porta 4173, gere o build atual antes dos E2E.

Para abrir o relatório entregue:

```bash
npx playwright show-report docs/evidencias/playwright-gaps-full-20261025T233514Z/report
```

## Pendências de performance

**Carregamento inicial no mobile.** As medianas de Performance foram 74 no início e 78 no detalhe, abaixo da meta de 90. Nas condições de rede Slow 4G e CPU com desaceleração de quatro vezes, o LCP — tempo até a exibição do maior elemento de conteúdo — foi de aproximadamente 5,13 s e 4,45 s, respectivamente. A análise registrada aponta o carregamento do runtime MSW, do JavaScript e a sequência de consultas e imagens como fatores que contribuem para essa espera. O TBT ficou entre 43 e 53 ms: os resultados indicam que a prioridade é antecipar a apresentação do conteúdo principal, e não apenas reduzir bloqueios de execução.

**Estabilidade visual no detalhe desktop.** Embora a pontuação de Performance tenha atingido 95, o CLS mediano foi de aproximadamente 0,116. Os relatórios identificam deslocamento do rodapé durante o preenchimento do conteúdo. A correção deve revisar o espaço reservado durante o carregamento e as dimensões dos skeletons em relação ao conteúdo final.
