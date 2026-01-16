# @susmi/store

Gerenciamento de estado global com Zustand para todas as aplicações do monorepo.

## Instalação

Este pacote é interno do workspace e instalado automaticamente via `pnpm install`.

## Stores Disponíveis

### UIStore

Gerencia estado de UI global (sidebar, theme, command palette).

```tsx
import { useUIStore } from '@susmi/store'

function Sidebar() {
  const {
    isSidebarOpen,
    isSidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed,
  } = useUIStore()

  return (
    <aside className={isSidebarCollapsed ? 'collapsed' : ''}>
      <button onClick={toggleSidebar}>Toggle</button>
    </aside>
  )
}

// Theme
function ThemeToggle() {
  const { theme, setTheme } = useUIStore()

  return (
    <select value={theme} onChange={e => setTheme(e.target.value)}>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  )
}

// Command Palette (Cmd+K)
function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useUIStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!isCommandPaletteOpen) return null

  return <div>Command Palette</div>
}
```

### NotificationsStore

Gerencia notificações em tempo real.

```tsx
import { useNotificationsStore } from '@susmi/store'

function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead } = useNotificationsStore()

  return (
    <div>
      <button onClick={markAllAsRead}>
        Notifications ({unreadCount})
      </button>
      <div>
        {notifications.map(notif => (
          <NotificationItem key={notif.id} notification={notif} />
        ))}
      </div>
    </div>
  )
}

// Adicionar notificação
function SomeComponent() {
  const addNotification = useNotificationsStore(state => state.addNotification)

  const handleSuccess = () => {
    addNotification({
      type: 'success',
      title: 'Sucesso!',
      message: 'Tarefa criada com sucesso',
      actionUrl: '/tasks/123',
    })
  }

  return <button onClick={handleSuccess}>Create Task</button>
}

// Marcar como lida
function NotificationItem({ notification }) {
  const markAsRead = useNotificationsStore(state => state.markAsRead)

  return (
    <div onClick={() => markAsRead(notification.id)}>
      {notification.title}
    </div>
  )
}
```

### SearchStore

Gerencia busca global e histórico.

```tsx
import { useSearchStore } from '@susmi/store'

function GlobalSearch() {
  const {
    query,
    results,
    isSearching,
    recentSearches,
    setQuery,
    setResults,
    setIsSearching,
    addRecentSearch,
  } = useSearchStore()

  const handleSearch = async (q: string) => {
    setQuery(q)
    setIsSearching(true)

    try {
      const data = await fetch(`/api/search?q=${q}`).then(r => r.json())
      setResults(data.results)
      addRecentSearch(q)
    } catch (error) {
      setResults([])
    }
  }

  return (
    <div>
      <input
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Search..."
      />

      {isSearching && <div>Searching...</div>}

      <div>
        {results.map(result => (
          <SearchResultItem key={result.id} result={result} />
        ))}
      </div>

      {!query && recentSearches.length > 0 && (
        <div>
          <h3>Recent Searches</h3>
          {recentSearches.map(search => (
            <button key={search} onClick={() => handleSearch(search)}>
              {search}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

## Persistence

A `UIStore` usa `persist` middleware para salvar preferências no localStorage:
- Sidebar collapsed state
- Theme preference

As outras stores são voláteis (não persistidas).

## Seletores Otimizados

Use seletores para evitar re-renders desnecessários:

```tsx
// ❌ Ruim - re-renderiza quando qualquer coisa na store muda
const store = useUIStore()

// ✅ Bom - re-renderiza apenas quando theme muda
const theme = useUIStore(state => state.theme)
const setTheme = useUIStore(state => state.setTheme)
```

## Estrutura

```
packages/store/
├── src/
│   ├── index.ts           # Exportações
│   ├── ui.ts              # UI state
│   ├── notifications.ts   # Notificações
│   └── search.ts          # Busca global
├── package.json
├── tsconfig.json
└── README.md
```

## Benefícios

- ✅ Estado global compartilhado
- ✅ Type-safe com TypeScript
- ✅ Performance otimizada (Zustand é rápido)
- ✅ DevTools integration
- ✅ Persistence automática (UI store)
- ✅ Seletores otimizados
