# Susmi - Arquitetura Detalhada

## 📐 Visão Geral da Arquitetura

O Susmi utiliza uma arquitetura **monorepo híbrido** que combina três tecnologias principais em uma estrutura coesa e escalável.

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
                              │ HTTP/REST
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
│  │  │   Tasks   │  │  │                 │  │  ┌───────────┐  │  │
│  │  │  Module   │  │  │                 │  │  │ Insights  │  │  │
│  │  └───────────┘  │  │                 │  │  └───────────┘  │  │
│  │  ┌───────────┐  │  │                 │  │  ┌───────────┐  │  │
│  │  │  Events   │  │  │                 │  │  │Predictions│  │  │
│  │  │  Module   │  │  │                 │  │  └───────────┘  │  │
│  │  └───────────┘  │  │                 │  └─────────────────┘  │
│  │  ┌───────────┐  │  │                 └───────────────────────┘
│  │  │ Reminders │  │  │
│  │  │  Module   │  │  │
│  │  └───────────┘  │  │
│  │  ┌───────────┐  │  │
│  │  │ Analytics │  │  │
│  │  │  Module   │  │  │
│  │  └───────────┘  │  │
│  │                 │  │
│  │  ┌───────────┐  │  │
│  │  │ Scheduler │  │  │
│  │  │ (Cron)    │  │  │
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
│PostgreSQL│   │  Redis  │
│  (DB)    │   │ (Cache) │
└─────────┘   └─────────┘
```

## 🔄 Fluxo de Dados

### 1. Autenticação

```
User → Frontend → POST /api/auth/login → NestJS
                                          │
                                          ├─ Validate credentials
                                          ├─ Generate JWT tokens
                                          └─ Return tokens + user data
                                          
Frontend ← JWT tokens ← NestJS
   │
   ├─ Store in localStorage
   ├─ Store in Zustand
   └─ Add to Axios headers
```

### 2. Criação de Tarefa

```
User → Frontend → POST /api/tasks → NestJS
                                      │
                                      ├─ Validate JWT
                                      ├─ Validate DTO
                                      ├─ Save to PostgreSQL via Prisma
                                      └─ Return created task
                                      
Frontend ← Task data ← NestJS
   │
   ├─ Update React Query cache
   └─ Show success toast
```

### 3. Geração de Recomendações

```
User → Frontend → GET /api/tasks → NestJS → PostgreSQL
                                      │
                                      └─ Return tasks
                                      
Frontend ← Tasks ← NestJS
   │
   └─ POST /api/recommendations/generate → Python Service
                                            │
                                            ├─ Analyze tasks
                                            ├─ Generate recommendations
                                            └─ Return recommendations
                                            
Frontend ← Recommendations ← Python Service
   │
   └─ Display in UI
```

### 4. Processamento de Lembretes (Background)

```
Scheduler (Every minute) → RemindersService
                            │
                            ├─ Query pending reminders from PostgreSQL
                            ├─ Filter by triggerAt <= now
                            │
                            └─ For each reminder:
                                │
                                ├─ Send notification
                                └─ Mark as sent in PostgreSQL
```

## 📦 Packages Compartilhadas

### @susmi/types

Contém todas as interfaces TypeScript compartilhadas:

```typescript
// Exemplo de uso
import { Task, TaskStatus, CreateTaskDto } from '@susmi/types';

// No backend
async createTask(dto: CreateTaskDto): Promise<Task> { ... }

// No frontend
const task: Task = await tasksService.createTask(dto);
```

**Benefícios:**
- Type safety entre frontend e backend
- Única fonte de verdade para tipos
- Autocomplete em toda a aplicação
- Detecção de erros em tempo de compilação

### @susmi/utils

Utilitários compartilhados:

```typescript
import { DateUtils, FormatUtils, ValidationUtils } from '@susmi/utils';

// Formatação de datas
DateUtils.format(new Date(), 'dd/MM/yyyy');
DateUtils.getRelativeTime(task.dueDate);

// Formatação de dados
FormatUtils.formatDuration(120); // "2h"
FormatUtils.formatTaskStatus('COMPLETED'); // "Concluída"

// Validação
ValidationUtils.isValidEmail(email);
ValidationUtils.isValidPassword(password);
```

### @susmi/config

Configurações centralizadas:

```typescript
import { API_CONFIG, TASK_CONFIG, JWT_CONFIG } from '@susmi/config';

// Usar configurações
const port = API_CONFIG.port;
const maxTitleLength = TASK_CONFIG.maxTitleLength;
const jwtSecret = JWT_CONFIG.secret;
```

## 🔐 Segurança

### Autenticação JWT

**Fluxo de Tokens:**

```
1. Login → Generate Access Token (15min) + Refresh Token (7d)
2. Store tokens in localStorage + Zustand
3. Add Access Token to all API requests
4. On 401 error → Try refresh token
5. If refresh succeeds → Update access token and retry
6. If refresh fails → Logout user
```

**Implementação:**

```typescript
// Axios interceptor
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      const { accessToken } = await authService.refreshToken(refreshToken);
      localStorage.setItem('accessToken', accessToken);
      return apiClient(originalRequest);
    }
    return Promise.reject(error);
  }
);
```

### Proteção de Rotas

**Backend:**
```typescript
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  @Get()
  async getTasks(@CurrentUser() user: any) {
    // user.userId disponível via decorator
  }
}
```

**Frontend:**
```typescript
// Middleware do Next.js
export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken');
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

## 💾 Camada de Dados

### Prisma ORM

**Schema Definition:**

```prisma
model Task {
  id          String       @id @default(uuid())
  title       String
  status      TaskStatus   @default(TODO)
  priority    TaskPriority @default(MEDIUM)
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  @@map("tasks")
}
```

**Uso no Código:**

```typescript
// Type-safe queries
const tasks = await this.prisma.task.findMany({
  where: { userId, status: 'TODO' },
  include: { category: true },
  orderBy: { createdAt: 'desc' },
});
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
await redisService.set(`tasks:${userId}`, JSON.stringify(tasks), 300); // 5min

return tasks;
```

## 🤖 Serviço de IA (Python)

### Arquitetura do Serviço

```
FastAPI Application
│
├── Routers
│   ├── /recommendations
│   ├── /insights
│   └── /predictions
│
├── Services
│   ├── RecommendationService
│   │   ├── analyze_overdue_tasks()
│   │   ├── analyze_workload()
│   │   └── suggest_task_grouping()
│   │
│   ├── InsightService
│   │   ├── analyze_completion_rate()
│   │   ├── analyze_time_patterns()
│   │   └── analyze_estimations()
│   │
│   └── PredictionService
│       ├── predict_task_completion()
│       └── calculate_historical_stats()
│
└── Models (Pydantic)
    ├── TaskData
    ├── Recommendation
    ├── Insight
    └── Prediction
```

### Algoritmos de Recomendação

**1. Análise de Carga de Trabalho:**

```python
def _analyze_workload(self, tasks, events):
    now = datetime.now()
    next_week = now + timedelta(days=7)
    
    upcoming_tasks = [t for t in tasks 
                     if t.dueDate and now <= t.dueDate <= next_week]
    upcoming_events = [e for e in events 
                      if now <= e.startDate <= next_week]
    
    total_workload = len(upcoming_tasks) + len(upcoming_events)
    
    if total_workload > 15:
        return Recommendation(
            type="workload_warning",
            title="Carga de Trabalho Alta",
            description=f"Você tem {total_workload} atividades na próxima semana",
            priority="MEDIUM"
        )
```

**2. Predição de Conclusão:**

```python
def predict_task_completion(self, task, historical_stats):
    # Usar tempo estimado ou histórico
    if task.estimatedTime:
        estimated_hours = task.estimatedTime / 60
    else:
        estimated_hours = historical_stats["by_priority"][task.priority]
    
    # Ajustar por prioridade
    multiplier = priority_multipliers[task.priority]
    adjusted_hours = estimated_hours * multiplier
    
    # Calcular data prevista
    predicted_date = now + timedelta(hours=adjusted_hours)
    
    return TaskCompletionPrediction(
        taskId=task.id,
        predictedCompletionDate=predicted_date,
        confidence=0.8,
        estimatedDuration=int(adjusted_hours * 60)
    )
```

## ⚡ Performance

### Otimizações Implementadas

**1. React Query (Frontend):**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['tasks', filters],
  queryFn: () => tasksService.getTasks(filters),
  staleTime: 60 * 1000, // Cache por 1 minuto
  refetchOnWindowFocus: false,
});
```

**2. Paginação (Backend):**
```typescript
async findAll(userId: string, pagination: PaginationParams) {
  const page = pagination.page || 1;
  const pageSize = pagination.pageSize || 20;
  const skip = (page - 1) * pageSize;
  
  const [items, total] = await Promise.all([
    this.prisma.task.findMany({ skip, take: pageSize }),
    this.prisma.task.count(),
  ]);
  
  return { items, total, page, pageSize };
}
```

**3. Redis Cache:**
```typescript
// Cache de dados frequentemente acessados
const cacheKey = `user:${userId}:preferences`;
const cached = await redisService.get(cacheKey);
if (cached) return JSON.parse(cached);

const preferences = await this.prisma.userPreferences.findUnique(...);
await redisService.set(cacheKey, JSON.stringify(preferences), 3600);
```

**4. Database Indexes:**
```prisma
model Task {
  @@index([userId, status])
  @@index([userId, dueDate])
  @@index([userId, priority])
}
```

## 🔄 Escalabilidade

### Horizontal Scaling

**Backend NestJS:**
- Stateless design permite múltiplas instâncias
- Load balancer (Nginx/AWS ALB) distribui requisições
- Redis compartilhado entre instâncias

**Serviço Python:**
- Múltiplas instâncias com Uvicorn workers
- Processamento paralelo de análises
- Queue system para tarefas pesadas

**Frontend Next.js:**
- Deploy em CDN (Vercel/CloudFront)
- Server-side rendering distribuído
- Edge functions para baixa latência

### Vertical Scaling

**Database:**
- Connection pooling do Prisma
- Read replicas para queries pesadas
- Particionamento de tabelas grandes

**Cache:**
- Redis Cluster para alta disponibilidade
- Eviction policies otimizadas
- Persistent storage para dados críticos

## 📊 Monitoramento

### Logs Estruturados

```typescript
// NestJS Logger
this.logger.log(`Task created: ${task.id}`, 'TasksService');
this.logger.error(`Failed to create task: ${error.message}`, 'TasksService');

// Python Logger
logger.info(f"Processing reminder: {reminder.id}")
logger.error(f"Failed to send notification: {error}")
```

### Métricas

**Backend:**
- Request/response time
- Error rates
- Database query performance
- Cache hit/miss ratio

**Frontend:**
- Page load time
- API response time
- User interactions
- Error boundaries

## 🧪 Testabilidade

### Estrutura de Testes

```
services/api/
├── src/
│   └── tasks/
│       ├── tasks.service.ts
│       ├── tasks.service.spec.ts  # Unit tests
│       ├── tasks.controller.ts
│       └── tasks.controller.spec.ts
└── test/
    └── tasks.e2e-spec.ts  # E2E tests
```

### Exemplo de Teste

```typescript
describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [TasksService, PrismaService],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should create a task', async () => {
    const dto: CreateTaskDto = {
      title: 'Test Task',
      priority: TaskPriority.HIGH,
    };

    const result = await service.create('user-id', dto);

    expect(result).toBeDefined();
    expect(result.title).toBe(dto.title);
  });
});
```

## 🚀 Deploy Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      PRODUCTION                         │
│                                                         │
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
│  │  PostgreSQL  │                  │              │  │
│  └──────────────┘                  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

**Esta arquitetura foi projetada para ser escalável, manutenível e preparada para o futuro.**
