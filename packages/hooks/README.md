# @susmi/hooks

Hooks React customizados compartilhados entre todas as aplicações do monorepo.

## Instalação

Este pacote é interno do workspace e instalado automaticamente via `pnpm install`.

## Hooks Disponíveis

### useDebounce

Debounce de valores com delay configurável.

```tsx
import { useDebounce } from '@susmi/hooks'

function SearchInput() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    // API call com valor debounced
    fetchResults(debouncedSearch)
  }, [debouncedSearch])

  return <input value={search} onChange={e => setSearch(e.target.value)} />
}
```

### useLocalStorage

localStorage com sync entre tabs e TypeScript.

```tsx
import { useLocalStorage } from '@susmi/hooks'

function Settings() {
  const [theme, setTheme, removeTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light')

  return (
    <div>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={removeTheme}>Reset</button>
    </div>
  )
}
```

### useMediaQuery

Media queries responsivas.

```tsx
import { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from '@susmi/hooks'

function ResponsiveComponent() {
  const isMobile = useIsMobile()        // < 768px
  const isTablet = useIsTablet()        // 769px - 1024px
  const isDesktop = useIsDesktop()      // > 1025px
  const isCustom = useMediaQuery('(min-width: 1200px)')

  return <div>{isMobile ? 'Mobile' : 'Desktop'}</div>
}
```

### useToggle

Toggle de valores booleanos.

```tsx
import { useToggle } from '@susmi/hooks'

function Modal() {
  const [isOpen, toggle, setIsOpen] = useToggle(false)

  return (
    <>
      <button onClick={toggle}>Toggle Modal</button>
      <button onClick={() => setIsOpen(true)}>Open</button>
      {isOpen && <div>Modal Content</div>}
    </>
  )
}
```

### useClickOutside

Detecta cliques fora de um elemento.

```tsx
import { useClickOutside } from '@susmi/hooks'
import { useRef } from 'react'

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside(ref, () => setIsOpen(false))

  return (
    <div ref={ref}>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && <div>Dropdown Content</div>}
    </div>
  )
}
```

### useCopyToClipboard

Copiar texto para clipboard.

```tsx
import { useCopyToClipboard } from '@susmi/hooks'

function CopyButton({ text }: { text: string }) {
  const [copiedText, copy, reset] = useCopyToClipboard()

  const handleCopy = async () => {
    const success = await copy(text)
    if (success) {
      setTimeout(reset, 2000)
    }
  }

  return (
    <button onClick={handleCopy}>
      {copiedText ? 'Copiado!' : 'Copiar'}
    </button>
  )
}
```

## Estrutura

```
packages/hooks/
├── src/
│   ├── index.ts              # Exportações
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   ├── useMediaQuery.ts
│   ├── useToggle.ts
│   ├── useClickOutside.ts
│   └── useCopyToClipboard.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Benefícios

- ✅ Hooks reutilizáveis em todo o monorepo
- ✅ Type-safe com TypeScript
- ✅ Client-side rendering pronto
- ✅ Performance otimizada
- ✅ Documentação completa
