# Susmi - Documentação Completa

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Instalação e Configuração](#instalação-e-configuração)
6. [Funcionalidades](#funcionalidades)
7. [API Endpoints](#api-endpoints)
8. [Desenvolvimento](#desenvolvimento)
9. [Deploy](#deploy)

## 🎯 Visão Geral

O **Susmi** é um planner digital inteligente desenvolvido com arquitetura monorepo híbrido que combina **NestJS**, **Next.js** e **Python** para oferecer uma solução completa de gerenciamento de produtividade. O sistema evolui de um planner básico para um assistente inteligente que aprende com os padrões do usuário.

### Objetivos Principais

O projeto foi desenvolvido com foco em quatro pilares fundamentais de produtividade, implementados na seguinte ordem de prioridade:

**1. Tarefas (To-Do List com Status)**
- Sistema completo de gerenciamento de tarefas com múltiplos status (A Fazer, Em Progresso, Concluída, Cancelada)
- Priorização inteligente (Baixa, Média, Alta, Urgente)
- Categorização personalizável com cores e ícones
- Tags para organização flexível
- Estimativa e rastreamento de tempo real
- Filtros avançados por status, prioridade, categoria, data e tags

**2. Agendamentos (Calendário/Eventos)**
- Calendário integrado com visualizações diária, semanal e mensal
- Tipos de eventos (Reunião, Compromisso, Lembrete, Prazo, Pessoal, Trabalho)
- Eventos recorrentes (Diário, Semanal, Mensal, Anual)
- Suporte para eventos de dia inteiro
- Gerenciamento de participantes
- Localização e descrições detalhadas

**3. Sistema de Lembretes com Timers**
- Lembretes automáticos vinculados a tarefas e eventos
- Verificação a cada minuto de lembretes pendentes
- Função de adiar (snooze) personalizável
- Status de lembretes (Pendente, Enviado, Dispensado, Adiado)
- Notificações configuráveis por minutos antes do evento
- Processamento em background via scheduler

**4. Relatórios de Produtividade (Dashboards/Métricas)**
- Métricas de produtividade em tempo real
- Taxa de conclusão de tarefas
- Tempo médio de conclusão
- Análise por prioridade, categoria e status
- Atividade diária detalhada
- Score de produtividade (0-100)
- Relatórios semanais e mensais automatizados
- Análise de tendências e comparações
- Sistema de conquistas (achievements)

### Fase Futura - Assistente Inteligente

O sistema foi arquitetado para evoluir para um assistente inteligente com as seguintes capacidades:

- **Processamento de Linguagem Natural**: Criar tarefas e eventos através de comandos em linguagem natural
- **Sugestões Inteligentes**: Recomendações baseadas em padrões de comportamento e histórico
- **Automação de Tarefas**: Identificação e automação de tarefas recorrentes
- **Predições**: Estimativas inteligentes de tempo de conclusão baseadas em histórico
- **Insights de Produtividade**: Análise profunda de padrões temporais e sugestões de otimização
- **Integração com APIs Externas**: Sincronização com calendários, emails e outras ferramentas

## 🏗️ Arquitetura

O projeto utiliza uma arquitetura **monorepo híbrido** que combina três tecnologias principais em uma estrutura coesa e escalável.

### Componentes Principais

#### 1. Backend API (NestJS 11.1.11)
- **Responsabilidade**: API REST principal, autenticação, CRUD de recursos
- **Tecnologias**: NestJS, Prisma ORM, PostgreSQL, Redis, JWT
- **Porta**: 3001
- **Características**:
  - Arquitetura modular baseada em módulos NestJS
  - Autenticação JWT com refresh tokens
  - Validação de dados com class-validator
  - Documentação automática com Swagger
  - Cache com Redis para otimização
  - Scheduler para tarefas em background (lembretes)

#### 2. Serviço de IA (Python 3.13)
- **Responsabilidade**: Processamento de dados, análises, recomendações inteligentes
- **Tecnologias**: FastAPI, Pandas, NumPy, Scikit-learn
- **Porta**: 8000
- **Características**:
  - API RESTful com FastAPI
  - Análise de padrões de produtividade
  - Geração de recomendações personalizadas
  - Predições de conclusão de tarefas
  - Insights baseados em dados históricos

#### 3. Frontend Web (Next.js 16.1)
- **Responsabilidade**: Interface do usuário, experiência interativa
- **Tecnologias**: Next.js 16, React 19, TypeScript, TailwindCSS
- **Porta**: 3000
- **Características**:
  - App Router do Next.js 16
  - Server Components e Client Components
  - React Query para gerenciamento de estado do servidor
  - Zustand para estado global da aplicação
  - TailwindCSS para estilização
  - Componentes Radix UI para acessibilidade

### Packages Compartilhadas

O monorepo utiliza packages compartilhadas para garantir consistência e reutilização de código:

#### @susmi/types
- Tipos TypeScript compartilhados entre frontend e backend
- Interfaces para Task, Event, Reminder, User, Analytics
- Enums para Status, Priority, Types
- DTOs para criação e atualização de recursos

#### @susmi/utils
- Utilitários de manipulação de datas (baseado em date-fns)
- Funções de validação
- Formatadores de dados
- Helpers compartilhados

#### @susmi/config
- Configurações centralizadas
- Constantes da aplicação
- Configurações de API, Database, Redis, JWT
- Configurações de funcionalidades (Tasks, Events, Reminders, Analytics)

### Fluxo de Dados

```
┌─────────────┐
│   Browser   │
│  (Next.js)  │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       v                 v
┌──────────────┐  ┌─────────────┐
│  NestJS API  │  │ Python AI   │
│  (Port 3001) │  │ (Port 8000) │
└──────┬───────┘  └─────────────┘
       │
       ├─────────────┐
       │             │
       v             v
┌──────────┐  ┌──────────┐
│PostgreSQL│  │  Redis   │
│  (Port   │  │ (Port    │
│   5432)  │  │  6379)   │
└──────────┘  └──────────┘
```

### Comunicação entre Serviços

**Frontend → Backend NestJS**
- Requisições HTTP/REST via axios
- Autenticação via Bearer Token (JWT)
- Refresh automático de tokens

**Frontend → Serviço Python**
- Requisições HTTP/REST para análises e recomendações
- Chamadas assíncronas para não bloquear UI

**Backend NestJS → Serviço Python**
- Comunicação HTTP para processamento de dados
- Geração de relatórios e insights

**Backend NestJS → PostgreSQL**
- Prisma ORM para queries type-safe
- Migrations automáticas
- Connection pooling

**Backend NestJS → Redis**
- Cache de dados frequentemente acessados
- Sessões de usuário
- Filas para processamento assíncrono

## 🛠️ Tecnologias Utilizadas

### Backend (NestJS)

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| NestJS | 11.1.11 | Framework backend principal |
| Prisma | 7.2.0 | ORM para PostgreSQL |
| PostgreSQL | 18 | Banco de dados relacional |
| Redis | 4.7.0 | Cache e filas |
| JWT | - | Autenticação e autorização |
| Passport | 0.7.0 | Estratégias de autenticação |
| Bcrypt | 5.1.1 | Hash de senhas |
| Class Validator | 0.14.1 | Validação de DTOs |
| Swagger | 8.0.0 | Documentação da API |

### Serviço Python

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| Python | 3.13 | Linguagem principal |
| FastAPI | 0.115.0 | Framework web assíncrono |
| Uvicorn | 0.32.0 | Servidor ASGI |
| Pydantic | 2.10.0 | Validação de dados |
| Pandas | 2.2.0 | Análise de dados |
| NumPy | 2.1.0 | Computação numérica |
| Scikit-learn | 1.5.0 | Machine Learning |

### Frontend (Next.js)

| Tecnologia | Versão | Propósito |
|-----------|--------|-----------|
| Next.js | 16.1.0 | Framework React |
| React | 19.0.0 | Biblioteca UI |
| TypeScript | 5.7.2 | Tipagem estática |
| TailwindCSS | 3.4.0 | Framework CSS |
| React Query | 5.62.0 | Gerenciamento de estado do servidor |
| Zustand | 5.0.0 | Gerenciamento de estado global |
| Axios | 1.7.0 | Cliente HTTP |
| React Hook Form | 7.54.0 | Gerenciamento de formulários |
| Zod | 3.24.0 | Validação de schemas |
| Radix UI | - | Componentes acessíveis |
| Lucide React | 0.468.0 | Ícones |
| Recharts | 2.15.0 | Gráficos e visualizações |
| Sonner | 1.7.0 | Notificações toast |

### Ferramentas de Desenvolvimento

| Ferramenta | Versão | Propósito |
|-----------|--------|-----------|
| Turborepo | 2.3.0 | Orquestração do monorepo |
| PNPM | 9.15.0 | Gerenciador de pacotes |
| TypeScript | 5.7.2 | Linguagem tipada |
| ESLint | 9.0.0 | Linting de código |
| Prettier | 3.2.5 | Formatação de código |

## 📁 Estrutura do Projeto

```
susmi/
├── apps/
│   └── web/                          # Aplicação Next.js
│       ├── src/
│       │   ├── app/                  # App Router (Next.js 16)
│       │   │   ├── (auth)/          # Grupo de rotas de autenticação
│       │   │   │   ├── login/
│       │   │   │   └── register/
│       │   │   ├── dashboard/       # Dashboard principal
│       │   │   ├── tasks/           # Gerenciamento de tarefas
│       │   │   ├── calendar/        # Calendário de eventos
│       │   │   ├── reminders/       # Lembretes
│       │   │   ├── analytics/       # Relatórios e métricas
│       │   │   ├── settings/        # Configurações
│       │   │   ├── layout.tsx       # Layout raiz
│       │   │   ├── page.tsx         # Página inicial
│       │   │   └── globals.css      # Estilos globais
│       │   ├── components/          # Componentes React
│       │   │   ├── ui/             # Componentes de UI base
│       │   │   ├── tasks/          # Componentes de tarefas
│       │   │   ├── calendar/       # Componentes de calendário
│       │   │   ├── reminders/      # Componentes de lembretes
│       │   │   ├── analytics/      # Componentes de analytics
│       │   │   └── providers.tsx   # Providers globais
│       │   ├── lib/                # Bibliotecas e utilitários
│       │   │   ├── api-client.ts   # Cliente HTTP configurado
│       │   │   └── utils.ts        # Utilitários gerais
│       │   ├── hooks/              # Custom React Hooks
│       │   │   ├── use-tasks.ts
│       │   │   ├── use-events.ts
│       │   │   └── use-auth.ts
│       │   ├── stores/             # Stores Zustand
│       │   │   └── auth-store.ts
│       │   └── services/           # Serviços de API
│       │       ├── auth.service.ts
│       │       ├── tasks.service.ts
│       │       ├── events.service.ts
│       │       ├── reminders.service.ts
│       │       └── analytics.service.ts
│       ├── public/                 # Arquivos estáticos
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       ├── tailwind.config.js
│       └── .env.example
│
├── packages/
│   ├── types/                      # Tipos TypeScript compartilhados
│   │   ├── src/
│   │   │   ├── task.types.ts
│   │   │   ├── event.types.ts
│   │   │   ├── reminder.types.ts
│   │   │   ├── analytics.types.ts
│   │   │   ├── user.types.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                      # Utilitários compartilhados
│   │   ├── src/
│   │   │   ├── date.utils.ts
│   │   │   ├── validation.utils.ts
│   │   │   ├── format.utils.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                     # Configurações compartilhadas
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── services/
│   ├── api/                        # Backend NestJS
│   │   ├── src/
│   │   │   ├── auth/              # Módulo de autenticação
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── strategies/
│   │   │   │       ├── jwt.strategy.ts
│   │   │   │       └── local.strategy.ts
│   │   │   ├── users/             # Módulo de usuários
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── users.controller.ts
│   │   │   ├── tasks/             # Módulo de tarefas
│   │   │   │   ├── tasks.module.ts
│   │   │   │   ├── tasks.service.ts
│   │   │   │   └── tasks.controller.ts
│   │   │   ├── events/            # Módulo de eventos
│   │   │   │   ├── events.module.ts
│   │   │   │   ├── events.service.ts
│   │   │   │   └── events.controller.ts
│   │   │   ├── reminders/         # Módulo de lembretes
│   │   │   │   ├── reminders.module.ts
│   │   │   │   ├── reminders.service.ts
│   │   │   │   ├── reminders.controller.ts
│   │   │   │   └── reminder.scheduler.ts
│   │   │   ├── analytics/         # Módulo de analytics
│   │   │   │   ├── analytics.module.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   └── analytics.controller.ts
│   │   │   ├── common/            # Recursos compartilhados
│   │   │   │   ├── prisma/
│   │   │   │   │   ├── prisma.module.ts
│   │   │   │   │   └── prisma.service.ts
│   │   │   │   ├── redis/
│   │   │   │   │   ├── redis.module.ts
│   │   │   │   │   └── redis.service.ts
│   │   │   │   ├── guards/
│   │   │   │   │   └── jwt-auth.guard.ts
│   │   │   │   └── decorators/
│   │   │   │       └── current-user.decorator.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Schema do banco de dados
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   └── .env.example
│   │
│   └── ai-service/                # Serviço Python de IA
│       ├── app/
│       │   ├── api/               # Rotas da API
│       │   │   ├── recommendations.py
│       │   │   ├── insights.py
│       │   │   └── predictions.py
│       │   ├── core/              # Configurações
│       │   │   └── config.py
│       │   ├── models/            # Modelos Pydantic
│       │   │   └── schemas.py
│       │   └── services/          # Lógica de negócio
│       │       ├── recommendation_service.py
│       │       ├── insight_service.py
│       │       └── prediction_service.py
│       ├── main.py
│       ├── requirements.txt
│       └── .env.example
│
├── turbo.json                     # Configuração Turborepo
├── pnpm-workspace.yaml            # Workspace PNPM
├── package.json                   # Package raiz
├── .gitignore
├── .prettierrc
├── README.md
└── DOCUMENTATION.md               # Este arquivo
```

### Descrição dos Diretórios Principais

**apps/web**: Contém a aplicação frontend Next.js com todas as páginas, componentes e lógica de apresentação.

**packages/**: Contém packages compartilhadas que podem ser importadas tanto pelo frontend quanto pelo backend, garantindo consistência de tipos e lógica.

**services/api**: Backend NestJS com toda a lógica de negócio, autenticação, acesso ao banco de dados e APIs REST.

**services/ai-service**: Serviço Python FastAPI responsável por análises avançadas, recomendações inteligentes e predições baseadas em dados.

## 🚀 Instalação e Configuração

### Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

- **Node.js** >= 22.0.0
- **PNPM** >= 9.0.0
- **Python** >= 3.13
- **PostgreSQL** 18
- **Redis** (última versão estável)
- **Git**

### 1. Clonar o Repositório

```bash
git clone <repository-url>
cd susmi
```

### 2. Instalar Dependências

```bash
# Instalar dependências de todos os projetos
pnpm install
```

### 3. Configurar Variáveis de Ambiente

#### Backend NestJS (services/api/.env)

```bash
cd services/api
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_planner"
DB_MAX_CONNECTIONS=10
DB_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TTL=3600

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# API
API_PORT=3001
CORS_ORIGINS=http://localhost:3000

# Python Service
PYTHON_SERVICE_HOST=localhost
PYTHON_SERVICE_PORT=8000
PYTHON_SERVICE_TIMEOUT=30000
```

#### Serviço Python (services/ai-service/.env)

```bash
cd services/ai-service
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=True

# NestJS API
NESTJS_API_URL=http://localhost:3001/api

# Security
API_SECRET_KEY=your-secret-key-change-in-production

# AI/ML Configuration
MODEL_PATH=./models
ENABLE_AI_FEATURES=True
```

#### Frontend Next.js (apps/web/.env.local)

```bash
cd apps/web
cp .env.example .env.local
```

Edite o arquivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_PYTHON_SERVICE_URL=http://localhost:8000/api
```

### 4. Configurar Banco de Dados

#### Criar banco de dados PostgreSQL

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar banco de dados
CREATE DATABASE smart_planner;

# Sair
\q
```

#### Executar migrations do Prisma

```bash
cd services/api
pnpm prisma migrate dev
pnpm prisma generate
```

### 5. Instalar Dependências Python

```bash
cd services/ai-service
python3.13 -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 6. Iniciar Serviços

#### Opção 1: Iniciar todos os serviços de uma vez (recomendado)

```bash
# Na raiz do projeto
pnpm dev
```

Isso iniciará:
- Frontend Next.js em `http://localhost:3000`
- Backend NestJS em `http://localhost:3001`
- Serviço Python em `http://localhost:8000`

#### Opção 2: Iniciar serviços individualmente

**Terminal 1 - Backend NestJS:**
```bash
cd services/api
pnpm dev
```

**Terminal 2 - Serviço Python:**
```bash
cd services/ai-service
source venv/bin/activate
python main.py
```

**Terminal 3 - Frontend Next.js:**
```bash
cd apps/web
pnpm dev
```

### 7. Acessar a Aplicação

- **Frontend**: http://localhost:3000
- **API Backend**: http://localhost:3001/api
- **Documentação API (Swagger)**: http://localhost:3001/docs
- **Serviço Python**: http://localhost:8000
- **Prisma Studio**: Execute `cd services/api && pnpm prisma studio`

### 8. Verificar Instalação

Acesse `http://localhost:3000` e você deverá ver a página de login do Susmi.

## ✨ Funcionalidades

### 1. Sistema de Autenticação

**Registro de Usuário**
- Criação de conta com email e senha
- Validação de email único
- Hash seguro de senhas com bcrypt
- Criação automática de preferências padrão

**Login**
- Autenticação via email e senha
- Geração de access token (JWT) com validade de 15 minutos
- Geração de refresh token com validade de 7 dias
- Estratégia JWT com Passport

**Refresh Token**
- Renovação automática de tokens expirados
- Interceptor no frontend para refresh transparente
- Logout automático em caso de falha

**Perfil de Usuário**
- Visualização e edição de perfil
- Upload de avatar
- Configuração de timezone
- Gerenciamento de preferências

### 2. Gerenciamento de Tarefas

**Criação de Tarefas**
- Título e descrição
- Prioridade (Baixa, Média, Alta, Urgente)
- Categoria personalizável
- Data de vencimento
- Tags para organização
- Estimativa de tempo

**Visualização de Tarefas**
- Lista com filtros avançados
- Visualização por status
- Visualização por prioridade
- Visualização por categoria
- Busca por tags
- Paginação

**Edição de Tarefas**
- Atualização de todos os campos
- Mudança de status
- Registro automático de data de conclusão
- Rastreamento de tempo real gasto

**Categorias**
- Criação de categorias personalizadas
- Definição de cores
- Ícones customizáveis
- Agrupamento de tarefas

**Status de Tarefas**
- A Fazer (TODO)
- Em Progresso (IN_PROGRESS)
- Concluída (COMPLETED)
- Cancelada (CANCELLED)

### 3. Calendário e Eventos

**Criação de Eventos**
- Título e descrição
- Tipo de evento (Reunião, Compromisso, Lembrete, Prazo, Pessoal, Trabalho)
- Data e hora de início/fim
- Eventos de dia inteiro
- Localização
- Participantes
- Cor personalizada

**Recorrência**
- Eventos únicos
- Recorrência diária
- Recorrência semanal
- Recorrência mensal
- Recorrência anual
- Data de término da recorrência

**Visualizações do Calendário**
- Visualização diária
- Visualização semanal
- Visualização mensal
- Lista de eventos próximos

**Lembretes de Eventos**
- Múltiplos lembretes por evento
- Configuração de minutos antes do evento
- Notificações automáticas

### 4. Sistema de Lembretes

**Tipos de Lembretes**
- Lembretes de tarefas
- Lembretes de eventos
- Lembretes personalizados

**Funcionalidades**
- Criação manual de lembretes
- Lembretes automáticos vinculados a tarefas/eventos
- Data e hora de disparo
- Título e descrição

**Gerenciamento**
- Visualização de lembretes pendentes
- Função de adiar (snooze) com duração personalizável
- Dispensar lembretes
- Histórico de lembretes enviados

**Processamento Automático**
- Scheduler que verifica lembretes a cada minuto
- Processamento em background
- Marcação automática como enviado
- Logs de processamento

### 5. Relatórios e Analytics

**Métricas de Produtividade**
- Taxa de conclusão de tarefas
- Tempo médio de conclusão
- Tempo total gasto
- Tarefas por prioridade
- Tarefas por categoria
- Tarefas por status
- Atividade diária
- Score de produtividade (0-100)

**Métricas de Eventos**
- Total de eventos
- Eventos por tipo
- Eventos próximos
- Eventos perdidos
- Duração média de eventos

**Relatórios Semanais**
- Resumo da semana
- Métricas de produtividade
- Métricas de eventos
- Destaques da semana
- Recomendações personalizadas

**Relatórios Mensais**
- Resumo do mês
- Comparação com mês anterior
- Análise de tendências
- Sistema de conquistas
- Gráficos e visualizações

**Análise de Padrões**
- Horários mais produtivos
- Dias da semana mais produtivos
- Análise de estimativas vs. tempo real
- Identificação de gargalos

### 6. Inteligência Artificial (Serviço Python)

**Recomendações Inteligentes**
- Análise de tarefas atrasadas
- Alertas de carga de trabalho
- Sugestões de priorização
- Agrupamento de tarefas similares
- Sugestões de pausas

**Insights de Produtividade**
- Análise de taxa de conclusão
- Análise de tempo de conclusão
- Identificação de padrões temporais
- Análise de precisão de estimativas

**Predições**
- Previsão de data de conclusão de tarefas
- Estimativa de duração baseada em histórico
- Ajuste por prioridade
- Nível de confiança da predição

### 7. Preferências do Usuário

**Tema**
- Modo claro
- Modo escuro
- Automático (baseado no sistema)

**Notificações**
- Email
- Push notifications
- Lembretes de tarefas
- Lembretes de eventos
- Relatórios semanais
- Relatórios mensais

**Calendário**
- Visualização padrão (dia/semana/mês)
- Primeiro dia da semana
- Horário de trabalho
- Exibição de finais de semana

**Produtividade**
- Meta diária de tarefas
- Técnica Pomodoro
- Duração do Pomodoro
- Duração das pausas

## 📡 API Endpoints

### Autenticação

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/auth/register` | Registrar novo usuário | Não |
| POST | `/api/auth/login` | Fazer login | Não |
| POST | `/api/auth/refresh` | Renovar access token | Não |

### Usuários

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/users/me` | Obter perfil do usuário | Sim |
| PUT | `/api/users/me` | Atualizar perfil | Sim |
| PUT | `/api/users/me/preferences` | Atualizar preferências | Sim |

### Tarefas

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/tasks` | Listar tarefas (com filtros) | Sim |
| GET | `/api/tasks/:id` | Obter detalhes de uma tarefa | Sim |
| POST | `/api/tasks` | Criar nova tarefa | Sim |
| PUT | `/api/tasks/:id` | Atualizar tarefa | Sim |
| DELETE | `/api/tasks/:id` | Deletar tarefa | Sim |

### Categorias de Tarefas

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/tasks/categories/list` | Listar categorias | Sim |
| POST | `/api/tasks/categories` | Criar categoria | Sim |
| PUT | `/api/tasks/categories/:id` | Atualizar categoria | Sim |
| DELETE | `/api/tasks/categories/:id` | Deletar categoria | Sim |

### Eventos

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/events` | Listar eventos (com filtros) | Sim |
| GET | `/api/events/:id` | Obter detalhes de um evento | Sim |
| GET | `/api/events/upcoming` | Obter eventos próximos | Sim |
| POST | `/api/events` | Criar novo evento | Sim |
| PUT | `/api/events/:id` | Atualizar evento | Sim |
| DELETE | `/api/events/:id` | Deletar evento | Sim |

### Lembretes

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/reminders` | Listar todos os lembretes | Sim |
| GET | `/api/reminders/pending` | Listar lembretes pendentes | Sim |
| GET | `/api/reminders/:id` | Obter detalhes de um lembrete | Sim |
| POST | `/api/reminders` | Criar novo lembrete | Sim |
| PUT | `/api/reminders/:id` | Atualizar lembrete | Sim |
| PUT | `/api/reminders/:id/snooze` | Adiar lembrete | Sim |
| PUT | `/api/reminders/:id/dismiss` | Dispensar lembrete | Sim |
| DELETE | `/api/reminders/:id` | Deletar lembrete | Sim |

### Analytics

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/analytics/productivity` | Obter métricas de produtividade | Sim |
| GET | `/api/analytics/events` | Obter métricas de eventos | Sim |
| GET | `/api/analytics/reports/weekly` | Obter relatório semanal | Sim |
| GET | `/api/analytics/reports/monthly` | Obter relatório mensal | Sim |

### Serviço Python - IA

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/recommendations/generate` | Gerar recomendações |
| POST | `/api/insights/generate` | Gerar insights |
| POST | `/api/predictions/task-completion` | Predizer conclusão de tarefas |

## 🔧 Desenvolvimento

### Comandos Disponíveis

#### Raiz do Projeto

```bash
# Instalar dependências
pnpm install

# Iniciar todos os serviços em modo desenvolvimento
pnpm dev

# Build de todos os projetos
pnpm build

# Executar linting
pnpm lint

# Executar testes
pnpm test

# Verificar tipos TypeScript
pnpm typecheck

# Formatar código
pnpm format

# Limpar node_modules e builds
pnpm clean
```

#### Backend NestJS

```bash
cd services/api

# Desenvolvimento
pnpm dev

# Build
pnpm build

# Produção
pnpm start:prod

# Prisma
pnpm prisma:generate    # Gerar cliente Prisma
pnpm prisma:migrate     # Executar migrations
pnpm prisma:studio      # Abrir Prisma Studio

# Testes
pnpm test
pnpm test:watch
pnpm test:cov
```

#### Serviço Python

```bash
cd services/ai-service

# Ativar ambiente virtual
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Desenvolvimento
python main.py

# Produção com Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000

# Instalar nova dependência
pip install <package>
pip freeze > requirements.txt
```

#### Frontend Next.js

```bash
cd apps/web

# Desenvolvimento
pnpm dev

# Build
pnpm build

# Produção
pnpm start

# Linting
pnpm lint
```

### Estrutura de Commits

Recomendamos seguir o padrão Conventional Commits:

```
feat: adiciona nova funcionalidade
fix: corrige bug
docs: atualiza documentação
style: formatação de código
refactor: refatoração sem mudança de comportamento
test: adiciona ou corrige testes
chore: tarefas de manutenção
```

### Fluxo de Desenvolvimento

**1. Criar nova branch**
```bash
git checkout -b feature/nome-da-feature
```

**2. Fazer alterações e commits**
```bash
git add .
git commit -m "feat: adiciona nova funcionalidade"
```

**3. Push e Pull Request**
```bash
git push origin feature/nome-da-feature
```

**4. Code Review e Merge**

### Debugging

#### Backend NestJS

Adicione ao `launch.json` do VS Code:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug NestJS",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["dev"],
  "cwd": "${workspaceFolder}/services/api",
  "console": "integratedTerminal"
}
```

#### Frontend Next.js

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Next.js",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["dev"],
  "cwd": "${workspaceFolder}/apps/web",
  "console": "integratedTerminal"
}
```

## 🚢 Deploy

### Backend NestJS

**Opção 1: Docker**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
EXPOSE 3001
CMD ["node", "dist/main"]
```

**Opção 2: Plataformas Cloud**

- **Heroku**: Adicionar `Procfile` com `web: node dist/main.js`
- **Railway**: Conectar repositório e configurar variáveis de ambiente
- **Render**: Deploy automático via GitHub
- **AWS ECS/EKS**: Usar Docker image

### Serviço Python

**Dockerfile**

```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Next.js

**Opção 1: Vercel (Recomendado)**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd apps/web
vercel
```

**Opção 2: Docker**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["pnpm", "start"]
```

### Banco de Dados PostgreSQL

**Opções de Hosting:**
- **Supabase**: PostgreSQL gerenciado com interface web
- **Railway**: Deploy rápido de PostgreSQL
- **AWS RDS**: Solução enterprise
- **DigitalOcean**: Managed Databases
- **Neon**: PostgreSQL serverless

### Redis

**Opções de Hosting:**
- **Redis Cloud**: Solução oficial gerenciada
- **Upstash**: Redis serverless
- **Railway**: Deploy rápido
- **AWS ElastiCache**: Solução enterprise

### Variáveis de Ambiente em Produção

Certifique-se de configurar todas as variáveis de ambiente nos respectivos serviços:

**Backend:**
- `DATABASE_URL`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS`

**Frontend:**
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_PYTHON_SERVICE_URL`

**Python:**
- `NESTJS_API_URL`
- `API_SECRET_KEY`

### CI/CD

Exemplo de workflow GitHub Actions:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
```

## 📝 Notas Finais

Este projeto foi desenvolvido com foco em escalabilidade, manutenibilidade e boas práticas de desenvolvimento. A arquitetura monorepo híbrido permite que cada serviço evolua independentemente enquanto compartilha código comum através das packages.

### Próximos Passos Sugeridos

**Curto Prazo:**
1. Implementar testes unitários e de integração
2. Adicionar autenticação OAuth (Google, GitHub)
3. Implementar notificações push reais
4. Adicionar suporte a anexos em tarefas
5. Implementar drag-and-drop no calendário

**Médio Prazo:**
1. Desenvolver aplicativo mobile (React Native)
2. Implementar sincronização offline
3. Adicionar colaboração em tempo real
4. Integração com calendários externos (Google Calendar, Outlook)
5. Sistema de templates de tarefas

**Longo Prazo:**
1. Processamento de linguagem natural completo
2. Assistente de voz
3. Integração com ferramentas de terceiros (Slack, Trello, etc.)
4. Machine Learning para predições avançadas
5. Dashboard administrativo para equipes

### Contribuindo

Contribuições são bem-vindas! Por favor, siga as diretrizes de código e envie pull requests para revisão.

### Suporte

Para dúvidas ou problemas, abra uma issue no repositório do projeto.

### Licença

Este projeto é proprietário. Todos os direitos reservados.

---

**Desenvolvido com ❤️ usando NestJS, Next.js e Python**
