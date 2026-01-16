/**
 * Supabase adapter for authentication
 */

import { createClient } from '@supabase/supabase-js'
import type { LoginCredentials, RegisterData, AuthUser, AuthTokens } from '../types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseAuthAdapter = {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) throw error
    if (!data.session) throw new Error('No session returned')

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
        role: (data.user.user_metadata?.role as 'USER' | 'ADMIN') || 'USER',
      },
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
    }
  },

  async register(data: RegisterData): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
          role: 'USER',
        },
      },
    })

    if (error) throw error
    if (!authData.session || !authData.user) throw new Error('No session or user returned')

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email!,
        name: data.name,
        role: 'USER',
      },
      tokens: {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
      },
    }
  },

  async getProfile(token: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.getUser(token)

    if (error) throw error

    return {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
      role: (data.user.user_metadata?.role as 'USER' | 'ADMIN') || 'USER',
      avatar: data.user.user_metadata?.avatar,
    }
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

    if (error) throw error
    if (!data.session) throw new Error('No session returned')

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },
}
