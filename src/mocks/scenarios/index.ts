import type { ScenarioId } from '@/shared/api/types'

const STORAGE_KEY = 'kurio:scenario'
const DETERMINISTIC_KEY = 'kurio:deterministic'

/** Client-side read (window). */
export function getScenarioFromClient(): ScenarioId {
  if (typeof window === 'undefined') return 'default'
  const fromUrl = new URLSearchParams(window.location.search).get('scenario')
  if (fromUrl) return fromUrl as ScenarioId
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return stored as ScenarioId
  return (import.meta.env.VITE_DEFAULT_SCENARIO as ScenarioId) || 'default'
}

/** Resolve scenario from request header (works in MSW Service Worker). */
export function getScenarioFromRequest(request?: Request): ScenarioId {
  const header = request?.headers.get('X-Kurio-Scenario')
  if (header) return header as ScenarioId
  return getScenarioFromClient()
}

/** @deprecated Prefer getScenarioFromRequest in handlers */
export function getScenario(): ScenarioId {
  return getScenarioFromClient()
}

export function setScenario(id: ScenarioId) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
}

export function resetScenario() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
}

export function isDeterministic(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(DETERMINISTIC_KEY) === '1'
}

export function setDeterministic(enabled: boolean) {
  if (typeof localStorage === 'undefined') return
  if (enabled) localStorage.setItem(DETERMINISTIC_KEY, '1')
  else localStorage.removeItem(DETERMINISTIC_KEY)
}

export function scenarioLatencyMs(scenario: ScenarioId): number {
  const det = isDeterministic()
  if (scenario === 'slow') return det ? 2000 : 1800 + Math.random() * 1200
  if (scenario === 'flaky') return det ? 400 : 200 + Math.random() * 800
  return det ? 50 : 80 + Math.random() * 120
}

export function shouldFailTransient(scenario: ScenarioId): boolean {
  if (scenario !== 'flaky') return false
  // Deterministic E2E mode: never random-fail (use catalog-error / favorites-fail instead)
  if (isDeterministic()) return false
  return Math.random() < 0.35
}

const executed = new Set<string>()
const pendingTimers = new Set<ReturnType<typeof setTimeout>>()
export function runScenarioOnce(key: string, action: () => void) {
  if (executed.has(key)) return
  executed.add(key)
  const timer = setTimeout(() => { pendingTimers.delete(timer); action() }, 800)
  pendingTimers.add(timer)
}
export function resetScenarioRuntime() {
  for (const timer of pendingTimers) clearTimeout(timer)
  pendingTimers.clear()
  executed.clear()
}
