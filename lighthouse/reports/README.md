# Lighthouse — execução de 25/10/2026

Executado `npm run lighthouse`: build de produção, cenário padrão e 12 medições válidas (três por página/perfil). Imagens, fontes, MSW e Socket.IO permaneceram habilitados. Não houve outra suíte de navegador em paralelo. Cada medição usou um novo perfil do Chromium; as categorias e métricas abaixo são medianas independentes.

| Página | Perfil | Performance | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | mobile | 74 | 100 | 100 | 92 | 5132 ms | 0.0000 | 53 ms |
| Início | desktop | 98 | 100 | 100 | 92 | 1025 ms | 0.0000 | 0 ms |
| Detalhe | mobile | 78 | 100 | 100 | 92 | 4451 ms | 0.0329 | 43 ms |
| Detalhe | desktop | 95 | 97 | 100 | 92 | 954 ms | 0.1160 | 0 ms |

**Pendência:** Performance mobile abaixo de 90 nas duas páginas. As demais categorias atingem 95/95/90; desktop também atinge Performance ≥90. O detalhe desktop ainda apresenta CLS ≈0,116: o relatório identifica deslocamento do rodapé quando o conteúdo é preenchido. Não classificado como resolvido.

O custo inicial do runtime MSW (aproximadamente 171 KB gzip), o carregamento de JavaScript/consultas e a renderização das imagens após os dados ainda dominam LCP mobile (4,45–5,13 s). TBT ficou entre 43–53 ms nas medianas mobile. O trabalho reduziu a consulta de contagens a metadados, separou renderização/inicialização da rede, manteve import tardio do socket e adiou o formulário de autenticação. Um preload do runtime foi medido e removido porque piorava a concorrência pelo carregamento inicial.

Antes dessas otimizações, uma medição diagnóstica de início mobile do build intermediário registrou Performance 81, LCP 4162 ms e TBT 46,5 ms. A série final não comprova ganho mobile em relação a esse ponto; essa regressão de performance permanece registrada. Esse diagnóstico não equivale a três medições do código original. As pontuações desktop da auditoria inicial usavam condições diferentes e não são uma comparação direta com o perfil Dense 4G atual.

Uma tentativa anterior da série foi interrompida por `ConnectionClosedError` do Chromium. O conjunto abaixo pertence à execução completa posterior, sem combinar amostras de execuções interrompidas.

## Ambiente e reprodução

- Node 26.11.1; Lighthouse 13.5.0; Chromium 156 (instalação Playwright).
- Linux 7.2.9-2-cachyos x64; AMD Ryzen 9 3900X, 24 CPUs lógicas; aproximadamente 16,66 GB RAM.
- Preview local em `http://127.0.0.1:4173`, armazenamento limpo por execução.
- Mobile: Slow 4G, RTT 150 ms, throughput 1638,4 Kbps, CPU ×4; desktop: Dense 4G, RTT 40 ms, throughput 10240 Kbps, CPU ×1.
- [`run.mjs`](../run.mjs) encontra Chromium via Playwright; `CHROME_PATH` é override opcional. Não há dependência de caminho específico do host.
- [`summary.json`](latest/summary.json) inclui ambiente, condições completas, medianas e metas; os relatórios individuais permitem inspecionar cada auditoria.

## Relatórios individuais

| Alvo | Execução 1 | Execução 2 | Execução 3 |
| --- | --- | --- | --- |
| home / mobile | [HTML](latest/home-mobile-run1.html) · [JSON](latest/home-mobile-run1.json) | [HTML](latest/home-mobile-run2.html) · [JSON](latest/home-mobile-run2.json) | [HTML](latest/home-mobile-run3.html) · [JSON](latest/home-mobile-run3.json) |
| home / desktop | [HTML](latest/home-desktop-run1.html) · [JSON](latest/home-desktop-run1.json) | [HTML](latest/home-desktop-run2.html) · [JSON](latest/home-desktop-run2.json) | [HTML](latest/home-desktop-run3.html) · [JSON](latest/home-desktop-run3.json) |
| detail / mobile | [HTML](latest/detail-mobile-run1.html) · [JSON](latest/detail-mobile-run1.json) | [HTML](latest/detail-mobile-run2.html) · [JSON](latest/detail-mobile-run2.json) | [HTML](latest/detail-mobile-run3.html) · [JSON](latest/detail-mobile-run3.json) |
| detail / desktop | [HTML](latest/detail-desktop-run1.html) · [JSON](latest/detail-desktop-run1.json) | [HTML](latest/detail-desktop-run2.html) · [JSON](latest/detail-desktop-run2.json) | [HTML](latest/detail-desktop-run3.html) · [JSON](latest/detail-desktop-run3.json) |
