# @susmi/auth

Pacote centralizado para lógica de autenticação compartilhada entre todas as aplicações do monorepo.

## Instalação

Este pacote é interno do workspace e instalado automaticamente via `pnpm install`.

## Uso

### 1. Adicionar o Provider no layout raiz

```tsx
// app/layout.tsx
import { AuthProvider } from '@susmi/auth'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 2. Usar o hook useAuth

```tsx
'use client'

import { useAuth } from '@susmi/auth'

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    await login('user@example.com', 'password')
  }

  if (isAuthenticated) {
    return <div>Bem-vindo, {user?.name}!</div>
  }

  return <form onSubmit={handleLogin}>...</form>
}
```

### 3. Outros hooks disponíveis

```tsx
import {
  useAuth,           // Hook completo
  useCurrentUser,    // Apenas o usuário
  useIsAuthenticated, // Apenas status de autenticação
  useIsAdmin         // Verifica se é admin
} from '@susmi/auth'

// Uso
const user = useCurrentUser()
const isAuthenticated = useIsAuthenticated()
const isAdmin = useIsAdmin()
```

### 4. API direta (sem hooks)

```tsx
import { authApi } from '@susmi/auth'

// Login
const { user, tokens } = await authApi.login({ email, password })

// Registro
const { user, tokens } = await authApi.register({ email, password, name })

// Perfil
const user = await authApi.getProfile(token)

// Refresh token
const tokens = await authApi.refreshToken(refreshToken)

// Logout
await authApi.logout(token)
```

### 5. Storage utils

```tsx
import { storage } from '@susmi/auth'

// Salvar tokens
storage.setTokens({ accessToken, refreshToken })

// Obter tokens
const tokens = storage.getTokens()

// Obter apenas access token
const accessToken = storage.getAccessToken()

// Limpar tokens
storage.clearTokens()
```

## Tipos

```tsx
import type {
  LoginCredentials,
  RegisterData,
  AuthUser,
  AuthTokens,
  AuthState,
} from '@susmi/auth'
```

## Estrutura

```
packages/auth/
├── src/
│   ├── index.ts      # Exportações principais
│   ├── types.ts      # Tipos TypeScript
│   ├── api.ts        # Chamadas à API
│   ├── context.tsx   # React Context Provider
│   ├── hooks.ts      # Hooks customizados
│   └── utils.ts      # Utilitários (storage, etc.)
├── package.json
├── tsconfig.json
└── README.md
```

## Benefícios

- ✅ Lógica de autenticação centralizada
- ✅ Reutilizável em web-app, admin e landing
- ✅ Type-safe com TypeScript
- ✅ Storage automático de tokens
- ✅ Hooks prontos para uso
- ✅ API client configurada
