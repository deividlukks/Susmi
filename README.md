# 🚀 S.U.S.M.I

> **S**implesmente **U**m **S**istema **M**uito **I**nteligente

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-Proprietary-red)

## 📝 Sobre o Projeto

**S.U.S.M.I** é uma plataforma completa de gestão de produtividade pessoal que integra tarefas, hábitos, projetos Kanban, calendário e analytics em uma única aplicação. Construído com arquitetura monorepo moderna, oferece uma experiência fluida e intuitiva para organizar sua vida digital.

### ✨ Funcionalidades Principais

- ✅ **Gerenciamento de Tarefas** - Sistema completo com status, prioridades, categorias e tags
- ✅ **Hábitos** - Rastreamento diário com check-ins, streaks e calendário visual
- ✅ **Projetos Kanban** - Gestão de projetos com quadros, colunas e drag-and-drop
- ✅ **Calendário** - Visualização integrada de eventos, tarefas e hábitos
- ✅ **Analytics** - Dashboards com gráficos de produtividade e métricas
- ✅ **Notificações** - Sistema de notificações em tempo real (WebSocket)
- ✅ **Busca Global** - Busca avançada com filtros (⌘K)
- ✅ **Administração** - Painel completo de gestão de usuários

## 🏗️ Stack Tecnológico

### Frontend
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| Next.js | 16.1.0 | Framework React com App Router |
| React | 19.0.0 | UI Library com Server Components |
| TailwindCSS | 3.4.x | Utility-first CSS |
| Radix UI | Latest | Componentes acessíveis |
| React Query | 5.62.x | State management e cache |
| Zustand | 5.0.x | State management global |
| Socket.IO | 4.8.x | WebSocket para tempo real |
| Recharts | 2.15.x | Gráficos responsivos |

### Backend
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| NestJS | 11.1.11 | Framework Node.js progressivo |
| Prisma | 6.19.1 | ORM type-safe |
| PostgreSQL | - | Banco de dados (via Supabase) |
| Redis | 4.7.x | Cache e sessões |
| JWT | - | Autenticação e autorização |
| Socket.IO | 4.8.x | WebSocket Gateway |

### Monorepo
| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| pnpm | 10.28.x | Gerenciador de pacotes |
| Turborepo | 2.3.x | Build system |
| TypeScript | 5.7.x | Type safety |

## 📁 Estrutura do Projeto

```
susmi/
├── apps/
│   ├── api/                   # Backend NestJS
│   │   ├── src/
│   │   │   ├── agents/        # Agentes autônomos
│   │   │   ├── auth/          # Autenticação
│   │   │   ├── tasks/         # Módulo de tarefas
│   │   │   ├── habits/        # Módulo de hábitos
│   │   │   ├── projects/      # Módulo de projetos
│   │   │   ├── events/        # Módulo de eventos
│   │   │   ├── analytics/     # Análises
│   │   │   ├── notifications/ # Notificações
│   │   │   ├── search/        # Busca global
│   │   │   ├── voice/         # Interface de voz
│   │   │   ├── workflows/     # Automações
│   │   │   └── integrations/  # Integrações externas
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   ├── web-app/               # Frontend Next.js (App principal)
│   │   └── src/
│   │       ├── app/           # Pages (App Router)
│   │       ├── components/    # Componentes React
│   │       ├── services/      # API clients
│   │       └── stores/        # Zustand stores
│   │
│   ├── landing/               # Landing Page
│   │
│   ├── admin/                 # Painel Admin (separado)
│   │
│   └── ai-service/            # Serviço Python (IA/LLM)
│       └── app/
│           ├── llm/           # Clientes LLM
│           └── services/      # Recomendações, Insights
│
├── packages/
│   ├── ui/                    # Componentes UI (@susmi/ui)
│   ├── types/                 # Types TypeScript (@susmi/types)
│   ├── utils/                 # Utilitários (@susmi/utils)
│   └── config/                # Configurações (@susmi/config)
│
├── docs/                      # Documentação
├── scripts/                   # Scripts utilitários
├── turbo.json                 # Configuração Turborepo
├── pnpm-workspace.yaml        # Workspace PNPM
└── vercel.json                # Configuração Vercel
```

## 🚀 Início Rápido

### Pré-requisitos

- Node.js >= 22.0.0
- pnpm >= 9.0.0
- PostgreSQL (ou conta Supabase)
- Redis (opcional para desenvolvimento)

### Instalação

```bash
# 1. Clone o repositório
git clone <repository-url>
cd susmi

# 2. Instale as dependências
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env

# 4. Configure o banco de dados
pnpm db:generate
pnpm db:migrate

# 5. Inicie os servidores
pnpm dev
```

### Acessar a Aplicação

| Serviço | URL |
|---------|-----|
| 🌐 Web App | http://localhost:3000 |
| 🔷 API | http://localhost:4000 |
| 📚 API Docs (Swagger) | http://localhost:4000/docs |
| 🗄️ Prisma Studio | `pnpm db:studio` |

### Criar Usuário Admin

```bash
pnpm create:admin
# Ou com parâmetros
pnpm create:admin admin@susmi.com Admin@123 "Administrador"
```

## 🛠️ Comandos Disponíveis

### Desenvolvimento

```bash
pnpm dev              # Inicia todos os serviços
pnpm dev:web          # Apenas frontend
pnpm dev:api          # Apenas backend
```

### Build

```bash
pnpm build            # Build de todos os projetos
pnpm typecheck        # Verificação de tipos
pnpm lint             # Linting
pnpm format           # Formata código
```

### Banco de Dados

```bash
pnpm db:generate      # Gera Prisma Client
pnpm db:migrate       # Aplica migrations (produção)
pnpm db:migrate:dev   # Cria e aplica migrations (dev)
pnpm db:push          # Push schema para DB
pnpm db:studio        # Abre Prisma Studio
pnpm db:reset         # Reseta banco de dados
```

## 📦 Packages Internos

### @susmi/ui

Biblioteca de componentes UI baseada em Radix UI e TailwindCSS.

```tsx
import { Button, Card, Badge } from '@susmi/ui';
```

### @susmi/types

Types e interfaces TypeScript compartilhados.

```tsx
import { Task, Event, Habit, User } from '@susmi/types';
```

### @susmi/utils

Funções utilitárias compartilhadas.

```tsx
import { DateUtils, FormatUtils } from '@susmi/utils';
```

## 🔐 Autenticação

- JWT com access e refresh tokens
- Roles: USER e ADMIN
- Integração com Supabase Auth
- Guards para rotas protegidas

## 📚 Documentação

- **[START.md](./docs/START.md)** - Início rápido e setup local
- **[ARQUITETURA.md](./docs/ARQUITETURA.md)** - Arquitetura detalhada do sistema
- **[DEPLOY.md](./docs/DEPLOY.md)** - Deploy na Vercel/Supabase
- **[AUDITORIA.md](./docs/AUDITORIA.md)** - Auditoria de conformidade

## 🔄 Status do Projeto

**Versão:** 1.0.0  
**Status:** ✅ Production Ready

### Funcionalidades Implementadas

- ✅ Autenticação e autorização completa
- ✅ CRUD completo de Tasks, Habits, Projects, Events
- ✅ Calendário integrado
- ✅ Dashboard com gráficos interativos
- ✅ Busca global com filtros avançados
- ✅ Notificações em tempo real (WebSocket)
- ✅ Biblioteca UI compartilhada (@susmi/ui)
- ✅ Agentes Autônomos
- ✅ Motor de Automação (Workflows)
- ✅ Interface de Voz (STT/TTS)
- ✅ Integrações Externas (Google, Todoist, Notion)

### Roadmap

- 🔄 Dark mode
- 🔄 App mobile (React Native)
- 🔄 Mais integrações (Slack, Microsoft 365)

## 📄 Licença

Proprietary - Todos os direitos reservados

---

<p align="center">
  Desenvolvido com ❤️ para aumentar a produtividade
</p>
