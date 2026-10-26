import { redirect } from '@tanstack/react-router'
import { getToken, isUnauthorized } from '@/shared/api/client'
import { endpoints } from '@/shared/api/endpoints'

export async function requireAuth(redirectTo: string) {
  const token = getToken()
  if (!token) {
    throw redirect({ to: '/login', search: { redirect: redirectTo } })
  }
  try {
    await endpoints.session()
  } catch (error) {
    if (!isUnauthorized(error)) throw error
    throw redirect({ to: '/login', search: { redirect: redirectTo } })
  }
}
