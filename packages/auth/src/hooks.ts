/**
 * Hooks customizados para autenticação
 */

'use client'

import { useAuthContext } from './context'

/**
 * Hook principal de autenticação
 * @example
 * const { user, login, logout, isAuthenticated } = useAuth()
 */
export function useAuth() {
  return useAuthContext()
}

/**
 * Hook para obter o usuário atual
 * @example
 * const user = useCurrentUser()
 */
export function useCurrentUser() {
  const { user } = useAuthContext()
  return user
}

/**
 * Hook para verificar se o usuário está autenticado
 * @example
 * const isAuthenticated = useIsAuthenticated()
 */
export function useIsAuthenticated() {
  const { isAuthenticated } = useAuthContext()
  return isAuthenticated
}

/**
 * Hook para verificar se o usuário é admin
 * @example
 * const isAdmin = useIsAdmin()
 */
export function useIsAdmin() {
  const { user } = useAuthContext()
  return user?.role === 'ADMIN'
}
