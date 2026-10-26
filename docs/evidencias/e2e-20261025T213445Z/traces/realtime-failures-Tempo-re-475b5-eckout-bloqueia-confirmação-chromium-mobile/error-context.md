# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: realtime-failures.spec.ts >> Tempo real e falhas >> price-changed no checkout bloqueia confirmação
- Location: e2e/realtime-failures.spec.ts:35:3

# Error details

```
Test timeout of 60000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f4e2]:
  - main [ref=f4e4]:
    - generic [ref=f4e5]:
      - status [ref=f4e6]
      - generic [ref=f4e7]:
        - button "Voltar" [ref=f4e8]
        - heading "Pagamento com carteira" [level=1] [ref=f4e11]
      - generic [ref=f4e12]:
        - region [ref=f4e13]:
          - heading "Perfil do colecionador" [level=2] [ref=f4e14]
          - generic [ref=f4e15]:
            - generic [ref=f4e16]:
              - generic [ref=f4e17]: Nome de exibição *
              - textbox "Nome de exibição *" [ref=f4e18]: Alice Colecionadora
            - generic [ref=f4e19]:
              - generic [ref=f4e20]: Nome de usuário *
              - textbox "Nome de usuário *" [ref=f4e21]: alice
            - generic [ref=f4e22]:
              - generic [ref=f4e23]: Rede *
              - combobox "Rede *" [ref=f4e24]:
                - option "Selecione uma rede"
                - option "Ethereum" [selected]
                - option "Polygon"
                - option "Arbitrum"
                - option "Solana"
            - generic [ref=f4e25]:
              - generic [ref=f4e26]: Nome do perfil (opcional)
              - textbox "Nome do perfil (opcional)" [ref=f4e27]: alice
            - generic [ref=f4e28]:
              - generic [ref=f4e29]: Endereço da carteira *
              - textbox "Endereço da carteira *" [ref=f4e30]:
                - /placeholder: Endereço 0x da carteira
                - text: "0xA11CE000000000000000000000000000000001"
            - generic [ref=f4e31]:
              - generic [ref=f4e32]: ENS ou carteira secundária (opcional)
              - textbox "ENS ou carteira secundária (opcional)" [ref=f4e33]
            - generic [ref=f4e34]:
              - generic [ref=f4e35]: Tipo de carteira *
              - combobox "Tipo de carteira *" [ref=f4e36]:
                - option "Selecione uma carteira"
                - option "MetaMask" [selected]
                - option "WalletConnect"
                - option "Coinbase Wallet"
                - option "Ledger"
            - generic [ref=f4e37]:
              - generic [ref=f4e38]: Código de indicação (opcional)
              - textbox "Código de indicação (opcional)" [ref=f4e39]
            - generic [ref=f4e40]:
              - generic [ref=f4e41]: E-mail *
              - textbox "E-mail *" [ref=f4e42]: alice@kurio.dev
            - generic [ref=f4e43]:
              - generic [ref=f4e44]: Nome ENS (opcional)
              - generic [ref=f4e45]:
                - combobox "Sufixo ENS" [ref=f4e46]:
                  - option ".eth" [selected]
                  - option ".xyz"
                  - option ".crypto"
                - textbox "Nome ENS (opcional)" [ref=f4e47]:
                  - /placeholder: nome
                  - text: alice
          - generic [ref=f4e48] [cursor=pointer]:
            - checkbox "Usar outra carteira?" [ref=f4e49]
            - text: Usar outra carteira?
          - generic [ref=f4e50]:
            - generic [ref=f4e51]: Observação do colecionador (opcional)
            - textbox "Observação do colecionador (opcional)" [ref=f4e52]
        - region [ref=f4e53]:
          - generic [ref=f4e54]:
            - heading "Carteira conectada" [level=2] [ref=f4e55]
            - link "Trocar carteira" [ref=f4e56] [cursor=pointer]:
              - /url: /wallets
          - radiogroup "Carteira conectada" [ref=f4e57]:
            - listitem [ref=f4e58]:
              - generic [ref=f4e59]:
                - radio "Selecionar Principal" [checked] [ref=f4e60]:
                  - generic [ref=f4e63]:
                    - generic [ref=f4e64]: Principal
                    - generic [ref=f4e65]: alice.eth
                    - generic [ref=f4e66]: Rede principal Ethereum
                - link "Gerenciar Principal" [ref=f4e67] [cursor=pointer]:
                  - /url: /wallets
        - region [ref=f4e72]:
          - heading "Carteira e rede" [level=2] [ref=f4e73]
          - radiogroup "Provedor de carteira" [ref=f4e74]:
            - radio "WalletConnect" [ref=f4e75]:
              - generic [aria-hidden] [ref=f4e76]: W
            - radio "MetaMask" [checked] [ref=f4e79]:
              - generic [aria-hidden] [ref=f4e80]: M
            - radio "Coinbase Wallet" [ref=f4e84]:
              - generic [aria-hidden] [ref=f4e85]: C
        - generic [ref=f4e89]:
          - generic [ref=f4e90]:
            - button "Simular conexão" [ref=f4e91]
            - button "Simular recusa" [ref=f4e92]
            - button "Desconectar" [ref=f4e93]
          - status [ref=f4e94]: "Status da carteira: connected"
        - generic [ref=f4e95]:
          - generic [ref=f4e96]:
            - generic [ref=f4e97]: "Total:"
            - generic [ref=f4e98]: 0.1045 ETH
          - button "Confirmar compra" [disabled] [ref=f4e99]
          - alert [ref=f4e101]:
            - paragraph [ref=f4e102]: "Cotação desatualizada. Aceite os novos valores antes de confirmar. Total anterior: 0.0945 ETH. Total atual: 0.1045 ETH."
            - list [ref=f4e103]:
              - listitem [ref=f4e104]: "Preço unitário: 0.092 → 0.102 ETH."
            - button "Aceitar novos valores" [ref=f4e105]
  - region "Notifications alt+T":
    - list:
      - listitem [ref=f4e106]:
        - button "Close toast" [ref=f4e107] [cursor=pointer]
        - generic [ref=f4e111]:
          - generic [ref=f4e112]: NFT atualizado
          - generic [ref=f4e113]: Preço ou disponibilidade mudou. Revise sua compra.
      - listitem [ref=f4e114]:
        - button "Close toast" [ref=f4e115] [cursor=pointer]
        - generic [ref=f4e122]: Carteira conectada (simulado)
```