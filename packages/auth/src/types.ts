/**
 * Tipos relacionados à autenticação
 */

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'USER' | 'ADMIN'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthState {
  user: AuthUser | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
}
