import { useAuth } from '@/features/auth/session'
import { getGuestId } from '@/shared/api/client'
export function useOwnerId() { const { user } = useAuth(); return user?.id ?? getGuestId() }
