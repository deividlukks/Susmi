# Landing Page - S.U.S.M.I

Site público e onepage do S.U.S.M.I (Simplesmente Um Sistema Muito Inteligente).

## Descrição

Aplicação Next.js 16 com App Router que serve como site institucional e porta de entrada para a plataforma. Apresenta as funcionalidades, stack tecnológica e arquitetura do sistema.

## Tecnologias

- **Next.js 16** - Framework React com App Router
- **React 19** - Biblioteca UI
- **TailwindCSS** - Estilização
- **Lucide React** - Ícones
- **Framer Motion** - Animações (opcional)
- **TypeScript** - Type safety

## Estrutura

```
apps/landing/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Layout root
│   │   └── page.tsx            # Homepage
│   ├── components/
│   │   ├── Header.tsx          # Navegação fixa no topo
│   │   ├── Hero.tsx            # Seção hero com CTA
│   │   ├── Features.tsx        # Grid de funcionalidades
│   │   ├── TechStack.tsx       # Stack tecnológica
│   │   ├── Architecture.tsx    # Arquitetura do monorepo
│   │   ├── CTA.tsx             # Call-to-action final
│   │   └── Footer.tsx          # Footer com links
│   └── styles/
│       └── globals.css         # Estilos globais
├── public/                     # Assets estáticos
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Seções da Landing Page

### 1. **Header**
- Logo S.U.S.M.I
- Navegação smooth scroll (Funcionalidades, Tecnologias, Arquitetura)
- Botão "Acessar Plataforma"
- Menu mobile responsivo

### 2. **Hero**
- Título e tagline
- Badge com versão (1.0.0 - MVP)
- Descrição breve
- CTAs principais (Começar Gratuitamente + Fazer Login)
- Stats (10+ Módulos, 3 Agentes IA, 20+ APIs, 100% TypeScript)

### 3. **Features**
Grid com 12 funcionalidades principais:
- Gestão de Tarefas
- Rastreamento de Hábitos
- Projetos Kanban
- Calendário Integrado
- Agentes de IA
- Automação de Workflows
- Analytics Avançado
- Notificações em Tempo Real
- Busca Global
- Interface de Voz
- Colaboração
- Integrações

### 4. **Tech Stack**
Organizado em 4 categorias:
- **Frontend**: Next.js, React, TailwindCSS, Radix UI, React Query, Zustand, Socket.IO
- **Backend**: NestJS, Prisma, PostgreSQL, Redis, JWT, Socket.IO, Swagger
- **AI Service**: FastAPI, OpenAI GPT-4, Anthropic Claude, TikToken
- **Infraestrutura**: Turborepo, pnpm, TypeScript, Vercel, Supabase

### 5. **Architecture**
- **Apps**: API (4000), Web App (3000), Admin (3002), AI Service (8000)
- **Packages**: @susmi/ui, @susmi/types, @susmi/config, @susmi/utils, @susmi/auth, @susmi/hooks, @susmi/store
- **Database**: PostgreSQL + Prisma ORM + Redis

### 6. **CTA Final**
- Call-to-action para criar conta
- Botão de login
- Links para documentação da API e GitHub

### 7. **Footer**
- Logo e descrição
- Links de navegação
- Links de recursos
- Copyright e políticas

## Scripts

```bash
# Desenvolvimento (porta 3001)
pnpm dev

# Build para produção
pnpm build

# Iniciar produção
pnpm start

# Linting
pnpm lint

# Type checking
pnpm typecheck
```

## Desenvolvimento

```bash
# Instalar dependências (já feito)
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Acessar em http://localhost:3001
```

## Links da Aplicação

A landing page contém links para:
- **Login**: `http://localhost:3000/login`
- **Registro**: `http://localhost:3000/register`
- **API Docs**: `http://localhost:4000/docs`
- **GitHub**: (configurar quando disponível)

## Deploy

### Vercel (Recomendado)

1. Conectar repositório no Vercel
2. Configurar build:
   - **Build Command**: `npx turbo run build --filter=@susmi/landing`
   - **Output Directory**: `apps/landing/.next`
   - **Install Command**: `pnpm install`
3. Configurar variáveis de ambiente (se necessário)
4. Deploy!

### Outras plataformas

O app é um Next.js padrão e pode ser deployado em:
- Netlify
- Railway
- Render
- AWS Amplify
- Cloudflare Pages

## Customização

### Cores
Edite `tailwind.config.ts` para alterar a paleta de cores. Atualmente usa:
- **Primary**: Azul (#0ea5e9 e variações)

### Conteúdo
Edite os componentes em `src/components/` para alterar textos, ícones e informações.

### Animações
As animações são feitas com classes do Tailwind:
- `animate-fade-in`
- `animate-slide-up`
- `animate-slide-down`

Para animações mais complexas, o Framer Motion já está instalado.

## Shared Packages

Este app utiliza os seguintes packages compartilhados:
- `@susmi/ui` - Componentes UI (Button, Card, etc.)
- `@susmi/types` - Tipos TypeScript
- `@susmi/utils` - Funções utilitárias

## Próximos Passos

- [ ] Adicionar screenshots/mockups da plataforma
- [ ] Implementar dark mode
- [ ] Adicionar seção de depoimentos
- [ ] Adicionar seção de pricing (se aplicável)
- [ ] Integrar analytics (Google Analytics, Plausible, etc.)
- [ ] Adicionar SEO metadata completo
- [ ] Criar sitemap.xml
- [ ] Configurar robots.txt
- [ ] Otimizar imagens e performance
- [ ] Adicionar blog/recursos (opcional)

## SEO

A landing já possui:
- ✅ Meta tags básicas (title, description)
- ✅ Keywords
- ✅ Open Graph tags
- ✅ Estrutura HTML semântica
- ⏳ Sitemap (a adicionar)
- ⏳ Schema.org markup (a adicionar)
- ⏳ Analytics (a adicionar)

## Performance

Otimizações implementadas:
- ✅ Server Components por padrão
- ✅ Lazy loading de componentes
- ✅ TailwindCSS (CSS otimizado)
- ✅ Next.js 16 optimizations
- ⏳ Imagens otimizadas (adicionar next/image quando houver imagens)

---

**Porta**: 3001
**Package**: @susmi/landing
**Versão**: 1.0.0
