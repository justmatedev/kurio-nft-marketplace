import { getScenarioFromClient } from '@/mocks/scenarios'
import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { mockStore } from '@/mocks/store'
import { subscribe } from '@/mocks/events'

// MSW 2.15 normalizes the Socket.IO transport path to the namespace root.
// Match that normalized URL as well as the transport URL used for upgrades.
const socketLink = ws.link(/^wss?:\/\/[^/]+\/(?:socket\.io\/)?$/)

export const socketHandler = socketLink.addEventListener('connection', connection => {
  // Root-path sockets such as Vite HMR must still reach their actual server.
  if (connection.client.url.pathname !== '/socket.io/') { connection.server.connect(); return }
  if (getScenarioFromClient() === 'socket-unavailable') { connection.client.close(1013, 'Conexão indisponível'); return }
  const io = toSocketIo(connection)
  let token: string | null = null
  let authenticated = false
  let closed = false
  let pongDeadline: ReturnType<typeof setTimeout> | undefined
  const onMessage = (message: MessageEvent) => {
    if (typeof message.data !== 'string') return
    if (message.data === '3') { clearTimeout(pongDeadline); return }
    if (message.data.startsWith('40')) {
      try { token = (JSON.parse(message.data.slice(2) || '{}') as { token?: string }).token ?? null } catch { token = null }
      authenticated = true
      if (token && !mockStore.getSession(token)) { connection.client.close(1008, 'Sessão inválida'); return }
      // The binding sends the Engine.IO open / namespace handshake. Application
      // messages must follow that handshake, never precede it.
      queueMicrotask(() => { if (!closed) io.client.emit('kurio:ready', { connected: true }) })
    }
  }
  connection.client.addEventListener('message', onMessage)
  const unsubscribe = subscribe(event => {
    if (closed || !authenticated) return
    if (event.type === 'order.updated' && mockStore.getSession(token)?.user.id !== event.userId) return
    io.client.emit(event.type, event)
  })
  const heartbeat = setInterval(() => {
    if (closed) return
    if (token && !mockStore.getSession(token)) { connection.client.close(1008, 'Sessão expirada'); return }
    connection.client.send('2')
    pongDeadline = setTimeout(() => connection.client.close(1001, 'Heartbeat timeout'), 5000)
  }, 20_000)
  connection.client.addEventListener('close', () => {
    closed = true
    unsubscribe()
    clearInterval(heartbeat)
    clearTimeout(pongDeadline)
    connection.client.removeEventListener('message', onMessage)
  })
})
