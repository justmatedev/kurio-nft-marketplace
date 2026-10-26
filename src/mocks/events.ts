import type { RealtimeEvent } from '@/shared/api/types'

// Domain events have one delivery path. No dependency on the store or React.
const listeners = new Set<(event: RealtimeEvent) => void>()
const history = new Map<string, RealtimeEvent>()
export function publish(event: RealtimeEvent) {
  const snapshot = structuredClone(event)
  history.set(snapshot.eventId, snapshot)
  if (history.size > 200) history.delete(history.keys().next().value!)
  for (const listener of listeners) listener(snapshot)
}
export function subscribe(listener: (event: RealtimeEvent) => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function replay(eventId: string) {
  const event = history.get(eventId)
  if (!event) return false
  for (const listener of listeners) listener(structuredClone(event))
  return true
}
export function eventHistory() { return [...history.values()] }
export function clearEvents() { history.clear() }
