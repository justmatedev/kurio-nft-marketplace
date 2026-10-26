import { setupWorker } from 'msw/browser'
import { restHandlers } from '@/mocks/handlers/rest'
import { socketHandler } from '@/mocks/handlers/socket'

export const worker = setupWorker(...restHandlers, socketHandler)

export async function startMockWorker() {
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true, serviceWorker: { url: '/mockServiceWorker.js' } })
  // Demo controls belong to the mock network layer, never to application hooks.
  window.__KURIO_EMIT_NFT__ = (nftId, overrides) => {
    void fetch('/api/dev/emit-nft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nftId, overrides }) })
  }
  window.__KURIO_EMIT_ORDER__ = (orderId, overrides) => {
    void fetch('/api/dev/emit-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, overrides }) })
  }
}
