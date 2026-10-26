import type { CreateOrderInput } from '@/shared/api/types'
export type PurchaseAttempt = { userId: string; key: string; body: CreateOrderInput; orderId?: string }
export const attemptKey = (userId: string) => `kurio:attempt:${userId}`
export function readAttempt(userId: string): PurchaseAttempt | null {
  try {
    const attempt = JSON.parse(localStorage.getItem(attemptKey(userId)) || 'null') as PurchaseAttempt | null
    return attempt?.userId === userId ? attempt : null
  } catch { return null }
}
export function writeAttempt(userId: string, attempt: PurchaseAttempt) { localStorage.setItem(attemptKey(userId), JSON.stringify(attempt)) }
export function clearAttempt(userId: string) { localStorage.removeItem(attemptKey(userId)) }
