# Susmi - Arquitetura do Sistema

## 📐 Visão Geral

O Susmi utiliza uma arquitetura **monorepo híbrido** que combina três tecnologias principais em uma estrutura coesa e escalável: **NestJS** (orquestrador lógico), **Python/FastAPI** (córtex criativo/IA), e **Next.js** (interface do usuário).

---

## 🏛️ Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Next.js 16.1 (React 19)                │ │
│  │                                                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │ │
│  │  │Dashboard │  │  Tasks   │  │ Calendar │  │Analytics │ │ │
│  │  │  Pages   │  │  Pages   │  │  Pages   │  │  Pages   │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │ │
│  │                                                           │ │
│  │  ┌──────────────────────────────────────────────────────┐│ │
│  │  │         React Query + Zustand (State Mgmt)          ││ │
│  │  └──────────────────────────────────────────────────────┘│ │
│  │                                                           │ │
│  │  ┌──────────────────────────────────────────────────────┐│ │
│  │  │              API Client (Axios + Auth)              ││ │
│  │  └──────────────────────────────────────────────────────┘│ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST + WebSocket
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        v                                           v
┌───────────────────────┐                 ┌───────────────────────┐
│   BACKEND API LAYER   │                 │   AI SERVICE LAYER    │
│                       │                 │                       │
│  ┌─────────────────┐  │                 │  ┌─────────────────┐  │
│  │  NestJS 11.1.11 │  │                 │  │  Python 3.13    │  │
│  │                 │  │                 │  │  FastAPI        │  │
│  │  ┌───────────┐  │  │                 │  │                 │  │
│  │  │   Auth    │  │  │                 │  │  ┌───────────┐  │  │
│  │  │  Module   │  │  │                 │  │  │Recommend- │  │  │
│  │  └───────────┘  │  │                 │  │  │ ations    │  │  │
│  │  ┌───────────┐  │  │                 │  │  └───────────┘  │  │
│  │  │  Agents   │  │  │                 │  │  ┌───────────┐  │  │
│  │  │ Autônomos │  │  │    <-------->   │  │  │ LLM/NLP   │  │  │
│  │  └───────────┘  │  │                 │  │  └───────────┘  │  │
│  │  ┌───────────┐  │  │                 │  │  ┌───────────┐  │  │
│  │  │ Workflows │  │  │                 │  │  │ Insights  │  │  │
│  │  └───────────┘  │  │                 │  │  └───────────┘  │  │
│  │  ┌───────────┐  │  │                 │  └─────────────────┘  │
│  │  │ WebSocket │  │  │                 └───────────────────────┘
│  │  │ Gateway   │  │  │
│  │  └───────────┘  │  │
│  └─────────────────┘  │
└───────────┬───────────┘
            │
            │ Prisma ORM
            │
    ┌───────┴───────┐
    │               │
    v               v
┌─────────┐   ┌─────────┐
│Supabase │   │  Redis  │
│PostgreSQL│   │ (Cache) │
└─────────┘   └─────────┘
```

---

## 📁 Estrutura de Diretórios

```
susmi/
├── apps/
│   ├── api/                   # Backend NestJS
│   │   ├── src/
│   │   │   ├── agents/        # Agentes autônomos
│   │   │   │   ├── base/      # Classes base
│   │   │   │   ├── core/      # Susmi.Core (guardião)
│   │   │   │   ├── agenda/    # Susmi.Agenda (tarefas/eventos)
│   │   │   │   └── habits/    # Susmi.Hábitos
│   │   │   ├── auth/          # Autenticação JWT
│   │   │   ├── users/         # Gestão de usuários
│   │   │   ├── tasks/         # Módulo de tarefas
│   │   │   ├── habits/        # Módulo de hábitos
│   │   │   ├── projects/      # Módulo de projetos Kanban
│   │   │   ├── events/        # Módulo de eventos
│   │   │   ├── calendar/      # Calendário integrado
│   │   │   ├── analytics/     # Análises e relatórios
│   │   │   ├── notifications/ # Sistema de notificações
│   │   │   ├── search/        # Busca global
│   │   │   ├── reminders/     # Lembretes
│   │   │   ├── voice/         # Interface de voz (STT/TTS)
│   │   │   ├── workflows/     # Motor de automação
│   │   │   ├── integrations/  # Integrações externas
│   │   │   ├── memory/        # Memória vetorial
│   │   │   └── common/        # Guards, decorators, utils
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   ├── web-app/               # Frontend Next.js (App principal)
│   │   └── src/
│   │       ├── app/           # Pages (App Router)
│   │       │   ├── dashboard/ # Dashboard principal
│   │       │   ├── tasks/     # Gestão de tarefas
│   │       │   ├── habits/    # Gestão de hábitos
│   │       │   ├── projects/  # Projetos Kanban
│   │       │   ├── calendar/  # Calendário
│   │       │   ├── reports/   # Analytics
│   │       │   └── admin/     # Painel administrativo
│   │       ├── components/    # Componentes React
│   │       │   ├── layout/    # Sidebar, Header
│   │       │   ├── ui/        # Componentes UI
│   │       │   └── ...
│   │       ├── services/      # API clients
│   │       ├── stores/        # Zustand stores
│   │       ├── hooks/         # Custom hooks
│   │       └── lib/           # Utilitários
│   │
│   ├── landing/               # Landing Page
│   │
│   ├── admin/                 # Painel Admin (separado)
│   │
│   └── ai-service/            # Serviço Python (IA/LLM)
│       ├── app/
│       │   ├── llm/           # Clientes LLM
│       │   │   ├── base.py    # Classe abstrata
│       │   │   ├── openai_client.py
│       │   │   ├── anthropic_client.py
│       │   │   └── factory.py
│       │   ├── services/      # Serviços
│       │   │   ├── recommendation_service.py
│       │   │   ├── insight_service.py
│       │   │   ├── nlp_service.py
│       │   │   └── intent_router_service.py
│       │   └── routers/       # Endpoints FastAPI
│       └── requirements.txt
│
├── packages/
│   ├── ui/                    # Componentes UI (@susmi/ui)
│   ├── types/                 # Types TypeScript (@susmi/types)
│   ├── utils/                 # Utilitários (@susmi/utils)
│   └── config/                # Configurações (@susmi/config)
│
├── scripts/                   # Scripts utilitários
└── docs/                      # Documentação
```

---

## 🔄 Fluxo de Dados

### Autenticação

```
User → Frontend → POST /api/auth/login → NestJS
                                          │
                                          ├─ Validate credentials (Supabase Auth)
                                          ├─ Generate JWT tokens
                                          └─ Return tokens + user data
                                          
Frontend ← JWT tokens ← NestJS
   │
   ├─ Store in cookies/localStorage
   ├─ Store in Zustand
   └─ Add to Axios headers
```

### Criação de Tarefa

```
User → Frontend → POST /api/tasks → NestJS
                                      │
                                      ├─ Validate JWT (JwtAuthGuard)
                                      ├─ Validate DTO
                                      ├─ Save to PostgreSQL via Prisma
                                      └─ Return created task
                                      
Frontend ← Task data ← NestJS
   │
   ├─ Update React Query cache
   └─ Show success toast
```

### Classificação de Intenção (IA)

```
User Input → NestJS → POST /api/llm/intent/classify → Python Service
                                                        │
                                                        ├─ Analyze text
                                                        ├─ Use LLM (Claude/GPT)
                                                        └─ Return intent + parameters
                                                        
NestJS ← Intent ← Python Service
   │
   └─ Route to appropriate agent
```

---

## 🤖 Sistema de Agentes Autônomos

### Filosofia

Os agentes são **entidades inteligentes** que usam serviços como ferramentas:

| Serviços | Agentes |
|----------|---------|
| Ferramentas passivas | Entidades inteligentes |
| `tasksService.create(task)` | `agendaAgent.decide(task)` |
| Apenas salva dados | Analisa contexto, decide ação |

### Agentes Implementados

#### Susmi.Core (Prioridade: 1000)
- **Papel**: Guardião e orquestrador central
- **Capacidades**: System health, audit log review, context cleanup
- **Nível**: Autônomo

#### Susmi.Agenda (Prioridade: 100)
- **Papel**: Gerenciamento de tarefas e eventos
- **Capacidades**: Daily briefing, conflict detection, time blocking, prioritization
- **Nível**: Recomendação

#### Susmi.Hábitos (Prioridade: 80)
- **Papel**: Rastreamento de comportamento
- **Capacidades**: Habit analytics, streak detection, motivational insights
- **Nível**: Recomendação

### Sistema de Memória

| Camada | Tecnologia | Duração | Uso |
|--------|------------|---------|-----|
| Curto Prazo | Redis | Minutos-Horas | Contexto da conversa |
| Médio Prazo | PostgreSQL | Meses-Anos | Histórico, logs |
| Longo Prazo | Vector DB (pgvector) | Permanente | Preferências semânticas |

---

## 🧠 Motor de IA (LLM)

### Arquitetura do Serviço Python

```
FastAPI Application
│
├── LLM Abstraction Layer
│   ├── BaseLLMClient (Abstract)
│   ├── OpenAIClient (GPT-4)
│   └── AnthropicClient (Claude)
│
├── Services Layer
│   ├── IntentRouterService
│   ├── NLPService
│   ├── RecommendationService
│   └── InsightService
│
└── API Endpoints
    ├── /api/llm/chat
    ├── /api/llm/intent/classify
    ├── /api/llm/question
    ├── /api/llm/summarize
    └── /api/llm/extract-entities
```

### Tipos de Intenção Suportados

- `CREATE_TASK` - Criar tarefa
- `UPDATE_TASK` - Atualizar tarefa
- `LIST_TASKS` - Listar tarefas
- `CREATE_EVENT` - Criar evento
- `CREATE_HABIT` - Criar hábito
- `TRACK_HABIT` - Registrar hábito
- `GET_BRIEFING` - Obter resumo diário
- `GET_RECOMMENDATIONS` - Obter recomendações
- `GENERAL_QUERY` - Pergunta geral

---

## ⚙️ Motor de Automação (Workflows)

### Estrutura

```typescript
interface Workflow {
  name: string;
  description: string;
  trigger: WorkflowTrigger;  // schedule, event, webhook, manual
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
}
```

### Tipos de Trigger

- **schedule**: Execução programada (cron)
- **event**: Baseado em eventos do sistema
- **webhook**: Chamada HTTP externa
- **manual**: Acionamento manual

### Ações Disponíveis

- `create_task` - Criar tarefa
- `send_notification` - Enviar notificação
- `http_request` - Requisição HTTP
- `send_email` - Enviar email

---

## 🔐 Segurança

### Autenticação JWT

```
1. Login → Generate Access Token (15min) + Refresh Token (7d)
2. Store tokens in localStorage + Zustand
3. Add Access Token to all API requests
4. On 401 error → Try refresh token
5. If refresh succeeds → Update access token and retry
6. If refresh fails → Logout user
```

### Proteção de Rotas

**Backend (NestJS):**
```typescript
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  @Get()
  async getTasks(@CurrentUser() user: User) {
    // user.userId disponível via decorator
  }
}
```

**Frontend (Next.js Middleware):**
```typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken');
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

---

## 💾 Camada de Dados

### Prisma ORM

**Modelos Principais:**

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(USER)
  tasks     Task[]
  habits    Habit[]
  projects  Project[]
  events    Event[]
}

model Task {
  id          String       @id @default(uuid())
  title       String
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  
  @@index([userId, status])
  @@index([userId, dueDate])
}
```

### Redis Cache

**Estratégia de Cache:**

```typescript
// 1. Check cache
const cached = await redisService.get(`tasks:${userId}`);
if (cached) return JSON.parse(cached);

// 2. Query database
const tasks = await this.prisma.task.findMany({ where: { userId } });

// 3. Store in cache
await redisService.set(`tasks:${userId}`, JSON.stringify(tasks), 300);

return tasks;
```

---

## 🔌 Integrações Externas

### Implementadas

| Serviço | Tipo | Status |
|---------|------|--------|
| Google Calendar | OAuth2 | ✅ Implementado |
| Gmail | OAuth2 | ✅ Implementado |
| Todoist | API Key | ✅ Implementado |
| Notion | OAuth2 | ✅ Implementado |

### Interface de Voz

- **Speech-to-Text**: Whisper (OpenAI)
- **Text-to-Speech**: OpenAI TTS
- **Fluxo**: Audio → STT → NLP → Agente → TTS → Audio

---

## 📦 Packages Compartilhados

### @susmi/types

Types e interfaces TypeScript compartilhados:

```typescript
import { Task, TaskStatus, CreateTaskDto } from '@susmi/types';
```

### @susmi/utils

Utilitários compartilhados:

```typescript
import { DateUtils, FormatUtils, ValidationUtils } from '@susmi/utils';
```

### @susmi/ui

Componentes UI baseados em Radix UI:

```typescript
import { Button, Card, Badge, Dialog } from '@susmi/ui';
```

### @susmi/config

Configurações centralizadas:

```typescript
import { API_CONFIG, TASK_CONFIG, JWT_CONFIG } from '@susmi/config';
```

---

## 🚀 Deploy

### Arquitetura de Produção

```
┌────────────────────────────────────────────────────────┐
│                      PRODUCTION                        │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Vercel     │  │   Railway    │  │   Railway    │ │
│  │  (Frontend)  │  │  (Backend)   │  │  (Python)    │ │
│  │  Next.js     │  │  NestJS      │  │  FastAPI     │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │         │
│         └─────────────────┴──────────────────┘         │
│                           │                            │
│         ┌─────────────────┴─────────────────┐         │
│         │                                   │         │
│  ┌──────┴───────┐                  ┌───────┴──────┐  │
│  │  Supabase    │                  │ Redis Cloud  │  │
│  │  PostgreSQL  │                  │   (Upstash)  │  │
│  └──────────────┘                  └──────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## ⚡ Performance

### Otimizações Implementadas

1. **React Query**: Cache de dados no frontend
2. **Paginação**: Backend com skip/take
3. **Redis Cache**: Dados frequentemente acessados
4. **Database Indexes**: Queries otimizadas

---

**Esta arquitetura foi projetada para ser escalável, manutenível e preparada para o futuro.**

*Última atualização: Janeiro 2026 (v1.0.1)*
