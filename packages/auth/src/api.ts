/**
 * API calls relacionadas à autenticação
 * Suporta múltiplos adapters (Supabase, API NestJS, etc)
 */

import axios from 'axios'
import type { LoginCredentials, RegisterData, AuthUser, AuthTokens } from './types'
import { supabaseAuthAdapter } from './adapters/supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
const AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'supabase' // 'supabase' | 'api'

/**
 * NestJS API adapter
 */
const nestApiAdapter = {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const response = await axios.post(`${API_URL}/auth/login`, credentials)
    return response.data
  },

  async register(data: RegisterData): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const response = await axios.post(`${API_URL}/auth/register`, data)
    return response.data
  },

  async getProfile(token: string): Promise<AuthUser> {
    const response = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
    return response.data
  },

  async logout(token?: string): Promise<void> {
    await axios.post(
      `${API_URL}/auth/logout`,
      {},
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    )
  },
}

/**
 * Auth API com adapter pattern
 * Automaticamente seleciona o provider correto
 */
export const authApi = AUTH_PROVIDER === 'supabase' ? supabaseAuthAdapter : nestApiAdapter
