/**
 * Utilitários para autenticação
 */

import type { AuthTokens } from './types'

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'susmi_access_token',
  REFRESH_TOKEN: 'susmi_refresh_token',
}

export const storage = {
  /**
   * Salva tokens no localStorage
   */
  setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken)
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken)
    }
  },

  /**
   * Obtém tokens do localStorage
   */
  getTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null

    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)

    if (!accessToken || !refreshToken) return null

    return { accessToken, refreshToken }
  },

  /**
   * Remove tokens do localStorage
   */
  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    }
  },

  /**
   * Obtém apenas o access token
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  },
}

/**
 * Verifica se o token JWT está expirado
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}
