// Rendering can start immediately. Network consumers wait for the MSW boundary.
let resolveReady: () => void
let rejectReady: (error: unknown) => void
export const networkReady = new Promise<void>((resolve, reject) => {
  resolveReady = resolve
  rejectReady = reject
})

export async function startNetwork() {
  try {
    if (import.meta.env.VITE_ENABLE_MSW !== 'false') {
      const { startMockWorker } = await import('@/mocks/browser')
      await startMockWorker()
    }
    resolveReady()
  } catch (error) {
    rejectReady(error)
  }
}
