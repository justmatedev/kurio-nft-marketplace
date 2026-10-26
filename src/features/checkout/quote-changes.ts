import type { Quote } from '@/shared/api/types'

/** Explain changed conditions even when the payable total remains identical. */
export function quoteChanges(previous: Quote, current: Quote): string[] {
  const changes: string[] = []
  if (previous.cartRevision !== current.cartRevision) changes.push('O carrinho foi editado.')
  for (const next of current.items) {
    const old = previous.items.find(item => item.cartItemId === next.cartItemId)
    if (!old) { changes.push(`Item ${next.nftId} adicionado.`); continue }
    if (old.quantity !== next.quantity) changes.push(`Quantidade: ${old.quantity} → ${next.quantity}.`)
    if (old.unitPriceEth !== next.unitPriceEth) changes.push(`Preço unitário: ${old.unitPriceEth} → ${next.unitPriceEth} ETH.`)
    if (old.available !== next.available) changes.push(`Disponibilidade: ${old.available} → ${next.available}.`)
  }
  if (previous.items.some(old => !current.items.some(next => old.cartItemId === next.cartItemId))) changes.push('Um item foi removido.')
  if (previous.networkFeeEth !== current.networkFeeEth) changes.push(`Taxa: ${previous.networkFeeEth} → ${current.networkFeeEth} ETH.`)
  if (previous.couponCode !== current.couponCode || previous.couponValid !== current.couponValid || previous.discountEth !== current.discountEth) changes.push(`Cupom/desconto revisado: ${current.couponCode ?? 'sem cupom'}, ${current.discountEth} ETH de desconto.`)
  if (previous.walletId !== current.walletId || previous.network !== current.network) changes.push('Carteira ou rede alterada.')
  return changes.length ? changes : ['Cotação expirada ou dados da carteira atualizados. Revise antes de continuar.']
}
