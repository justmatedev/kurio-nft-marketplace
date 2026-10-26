import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Nft, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/shared/api/types'
import { useAuth } from '@/features/auth/session'
import { networkReady } from '@/app/network-ready'

const SocketContext = createContext<{ socket: Socket | null }>({ socket: null })

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth()
  const queryClient = useQueryClient()
  const [socket, setSocket] = useState<Socket | null>(null)
  const userId = user?.id
  useEffect(() => {
    let active: Socket | undefined
    let cancelled = false
    const versions = new Map<string, number>()
    const seen = new Set<string>()
    const accept = (type: string, id: string, version: number, eventId: string, cachedVersion = 0) => {
      const key = `${type}:${id}`
      if (cancelled || seen.has(eventId) || version <= Math.max(versions.get(key) ?? 0, cachedVersion)) return false
      seen.add(eventId)
      if (seen.size > 500) seen.delete(seen.values().next().value!)
      versions.set(key, version)
      return true
    }
    const onNft = (event: NftUpdatedEvent) => {
      const cached = queryClient.getQueriesData<Nft>({ queryKey: ['nft'] }).map(([, data]) => data?.id === event.id ? data.version : 0)
      for (const [, data] of queryClient.getQueriesData<{ items?: Nft[]; featured?: Nft[] }>({ queryKey: ['nfts'] })) {
        cached.push((data?.items ?? data?.featured ?? []).find(nft => nft.id === event.id)?.version ?? 0)
      }
      if (!accept('nft', event.id, event.version, event.eventId, Math.max(0, ...cached))) return
      for (const key of ['nfts', 'nft', 'cart', 'quote']) void queryClient.invalidateQueries({ queryKey: [key] })
      toast.message('NFT atualizado', { description: 'Preço ou disponibilidade mudou. Revise sua compra.' })
    }
    const onOrder = async (event: OrderUpdatedEvent) => {
      if (!userId || event.userId !== userId) return
      const key = ['order', userId, event.id]
      const old = queryClient.getQueryData<Order>(key)
      if (!accept('order', event.id, event.version, event.eventId, old?.version)) return
      if (old && old.status !== 'pending') return
      // Never fabricate a receipt by merging an event into REST data.
      await queryClient.invalidateQueries({ queryKey: key })
      if (cancelled) return
      const current = queryClient.getQueryData<Order>(key)
      if (current?.status === 'confirmed') toast.success('Pedido confirmado')
      if (current?.status === 'rejected') toast.error(current.rejectionReason ?? 'Pedido recusado')
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    }
    void networkReady.then(() => import('socket.io-client')).then(({ io }) => {
      if (cancelled) return
      active = io(import.meta.env.VITE_SOCKET_URL || '/', {
        path: '/socket.io', transports: ['websocket'], autoConnect: false,
        reconnection: true, auth: { token },
      })
      active.on('nft.updated', onNft)
      active.on('order.updated', onOrder)
      active.on('connect', () => {
        for (const key of ['nfts', 'nft', 'cart', 'quote', 'order']) void queryClient.invalidateQueries({ queryKey: [key] })
        if (userId) void queryClient.invalidateQueries({ queryKey: ['session'] })
      })
      setSocket(active)
      if (import.meta.env.VITE_ENABLE_MSW !== 'false') window.__KURIO_SOCKET__ = active
      active.connect()
    }).catch(() => { /* REST error states expose initialization failures with retry. */ })
    return () => {
      cancelled = true
      active?.removeAllListeners()
      active?.disconnect()
      if (window.__KURIO_SOCKET__ === active) window.__KURIO_SOCKET__ = null
    }
  }, [token, userId, queryClient])
  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>
}

export function useSocket() { return useContext(SocketContext) }
