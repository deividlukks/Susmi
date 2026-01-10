# Susmi

Planner digital inteligente com arquitetura monorepo híbrido que evolui para um assistente pessoal.

## 🏗️ Arquitetura

Este projeto utiliza uma arquitetura monorepo híbrido com as seguintes tecnologias:

**Backend:**
- NestJS 11.1.11 (API REST/GraphQL)
- Prisma ORM 7.2.0
- PostgreSQL 18
- Redis (cache e filas)

**Frontend:**
- Next.js 16.1
- React 19
- TypeScript
- TailwindCSS

**Serviços:**
- Python 3.13 (processamento de dados e IA)

**Gerenciamento:**
- Turborepo (orquestração do monorepo)
- PNPM (gerenciador de pacotes)

## 📁 Estrutura do Projeto

```
susmi/
├── apps/
│   └── web/                 # Aplicação Next.js
├── packages/
│   ├── types/              # Tipos TypeScript compartilhados
│   ├── utils/              # Utilitários compartilhados
│   ├── config/             # Configurações compartilhadas
│   └── ui/                 # Componentes UI compartilhados
├── services/
│   ├── api/                # Backend NestJS
│   └── ai-service/         # Serviço Python para IA
├── turbo.json              # Configuração Turborepo
├── pnpm-workspace.yaml     # Workspace PNPM
└── package.json            # Configuração raiz
```

## 🚀 Funcionalidades

### Fase 1 - Planner Básico
- ✅ **Tarefas:** Sistema completo de to-do list com status, prioridades e categorias
- ✅ **Agendamentos:** Calendário integrado com eventos e compromissos
- ✅ **Lembretes:** Sistema de notificações com timers configuráveis
- ✅ **Relatórios:** Dashboards de produtividade e métricas de desempenho

### Fase 2 - Assistente Inteligente (Futuro)
- 🔄 Processamento de linguagem natural
- 🔄 Sugestões inteligentes baseadas em padrões
- 🔄 Automação de tarefas recorrentes
- 🔄 Integração com APIs externas

## 🛠️ Requisitos

- Node.js >= 22.0.0
- PNPM >= 9.0.0
- Python >= 3.13
- PostgreSQL 18
- Redis

## 📦 Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env

# Executar migrações do banco
cd services/api && pnpm prisma migrate dev

# Iniciar ambiente de desenvolvimento
pnpm dev
```

## 🏃 Comandos Disponíveis

```bash
pnpm dev          # Inicia todos os serviços em modo desenvolvimento
pnpm build        # Compila todos os projetos
pnpm lint         # Executa linting em todos os projetos
pnpm test         # Executa testes
pnpm typecheck    # Verifica tipos TypeScript
pnpm clean        # Remove node_modules e builds
```

## 📝 Licença

Proprietário - Todos os direitos reservados
