/**
 * @susmi/auth
 *
 * Pacote centralizado para lógica de autenticação compartilhada
 * entre todas as aplicações do monorepo.
 *
 * Suporta múltiplos providers via adapters:
 * - Supabase (padrão para web-app)
 * - NestJS API (para admin e outras apps)
 */

export * from './api'
export * from './context'
export * from './hooks'
export * from './types'
export * from './utils'
export * from './adapters/supabase'
