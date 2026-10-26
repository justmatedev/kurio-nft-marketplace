import { useAuth } from './session'
import { getGuestId, getToken } from '@/shared/api/client'

/** Mutation callbacks belong to the session that started the operation. */
export function useSessionGuard() {
  const { token } = useAuth()
  const guestId = getGuestId()
  return () => getToken() === token && (token !== null || getGuestId() === guestId)
}
