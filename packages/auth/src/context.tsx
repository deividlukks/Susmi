/**
 * Context Provider para autenticação
 */

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { AuthState, AuthUser, AuthTokens } from './types'
import { authApi } from './api'
import { storage } from './utils'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: AuthUser) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
  })

  // Carregar tokens do storage na inicialização
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const tokens = storage.getTokens()
        if (tokens?.accessToken) {
          const user = await authApi.getProfile(tokens.accessToken)
          setState({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
          })
        } else {
          setState(prev => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        console.error('Failed to load auth:', error)
        storage.clearTokens()
        setState(prev => ({ ...prev, isLoading: false }))
      }
    }

    loadAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const { user, tokens } = await authApi.login({ email, password })
    storage.setTokens(tokens)
    setState({ user, tokens, isAuthenticated: true, isLoading: false })
  }

  const register = async (email: string, password: string, name: string) => {
    const { user, tokens } = await authApi.register({ email, password, name })
    storage.setTokens(tokens)
    setState({ user, tokens, isAuthenticated: true, isLoading: false })
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
    storage.clearTokens()
    setState({ user: null, tokens: null, isAuthenticated: false, isLoading: false })
  }

  const updateUser = (user: AuthUser) => {
    setState(prev => ({ ...prev, user }))
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
