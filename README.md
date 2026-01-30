# S.U.S.M.I - Sistema Unificado de Suporte e Monitoramento Inteligente

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node">
  <img src="https://img.shields.io/badge/python-%3E%3D3.11-blue.svg" alt="Python">
  <img src="https://img.shields.io/badge/status-production--ready-success.svg" alt="Status">
</p>

<p align="center">
  <strong>Assistente Inteligente Pessoal completo inspirado no JARVIS</strong>
  <br>
  Automatize sua vida com IA, integre tudo em um só lugar
</p>

---

## 📖 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Principais Funcionalidades](#principais-funcionalidades)
- [Arquitetura](#arquitetura)
- [Stack Tecnológica](#stack-tecnológica)
- [Começando](#começando)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Módulos e Recursos](#módulos-e-recursos)
- [Integrações](#integrações)
- [Deploy](#deploy)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Documentação](#documentação)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## Sobre o Projeto

**S.U.S.M.I** é um assistente inteligente pessoal completo que integra múltiplos aspectos da sua vida digital em uma única plataforma. Com inteligência artificial avançada, automações inteligentes e integração profunda com serviços externos, o S.U.S.M.I ajuda você a gerenciar tarefas, comunicações, finanças, saúde, casa inteligente e muito mais.

### Por que S.U.S.M.I?

- **Tudo em um só lugar**: Gerencie tarefas, finanças, comunicações, saúde e casa inteligente em uma única plataforma
- **IA Avançada**: Integração com GPT-4, Claude e outros modelos de IA para processamento inteligente
- **Automação Poderosa**: Crie workflows e automações complexas sem programar
- **Sistema de Agentes**: Agentes IA especializados que executam tarefas automaticamente
- **Privacidade**: Self-hosted, seus dados são seus
- **Extensível**: Arquitetura modular permite adicionar novas funcionalidades facilmente

---

## Principais Funcionalidades

### 🎯 Gerenciamento de Tarefas
- CRUD completo de tarefas com prioridades e subtarefas
- Tags, filtros avançados e estatísticas
- Alertas de tarefas atrasadas
- Integração com IA para sugestões inteligentes

### 🤖 Sistema de Agentes IA
- 6 tipos de agentes especializados (Financeiro, Operacional, Desenvolvimento, etc.)
- Execução de tarefas automáticas com ferramentas
- Memória de curto, longo prazo, episódica e semântica
- Histórico completo de execuções

### ⚙️ Motor de Automação
- Triggers: TIME, CRON, EVENT, WEBHOOK, DEVICE_STATE
- Workflows visuais com condições e ações
- Logs detalhados de execução
- Cooldown e rate limiting para evitar loops

### 💰 Gerenciamento Financeiro
- Múltiplas contas bancárias e cartões de crédito
- Sincronização automática via Open Banking (Pluggy, Belvo)
- Categorização automática com IA
- Orçamentos, metas e relatórios financeiros
- Importação de CSV

### 📧 Comunicações Unificadas
- Email (Gmail OAuth2, SMTP genérico)
- WhatsApp Web integration
- Telegram Bot
- Agendamento de mensagens
- Análise de sentimento e resumos com IA

### 📅 Calendário Inteligente
- Integração com Google Calendar e Outlook
- Sincronização bidirecional
- Otimização de rotas entre eventos (Google Maps)
- Sugestões de eventos com IA
- Suporte a eventos recorrentes (RRULE)

### 🏠 Casa Inteligente
- Controle de dispositivos (Wi-Fi, Zigbee, Z-Wave, MQTT)
- Cenas e rotinas automatizadas
- Integração com Tuya, Philips Hue, Home Assistant
- Assistentes de voz (Alexa, Google Home, Siri)
- Histórico de ações

### 💊 Saúde e Bem-estar
- Gerenciamento de medicamentos com lembretes
- Rastreamento de workouts e métricas de saúde
- Integração com wearables (Fitbit, Google Fit, Garmin, Strava, etc.)
- Metas de saúde e análise de progresso

### 📚 Base de Conhecimento (RAG)
- Upload de PDFs, URLs, textos e notas
- Vector search com Pinecone, Weaviate ou Qdrant
- Perguntas e respostas com contexto
- Busca na web integrada

### 🎤 Interface de Voz
- Speech-to-Text (Whisper, Deepgram)
- Text-to-Speech com múltiplos provedores
- Wake word detection
- Streaming de áudio em tempo real via WebSocket

### 🔒 Auditoria e Governança
- Rastreamento automático de todas as ações
- Logs detalhados de CRUD
- IP tracking e User Agent
- Dashboard de governança

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        S.U.S.M.I Platform                       │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Frontend       │  │   Backend API    │  │   AI Service     │
│   (Next.js 15)   │  │   (NestJS)       │  │   (FastAPI)      │
│                  │  │                  │  │                  │
│  - React 19      │  │  - Prisma ORM    │  │  - OpenAI        │
│  - Zustand       │  │  - JWT Auth      │  │  - Anthropic     │
│  - Supabase      │  │  - WebSockets    │  │  - LangChain     │
│  - TypeScript    │  │  - Redis Cache   │  │  - Python 3.11   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
           │                    │                    │
           └────────────────────┼────────────────────┘
                                ▼
                    ┌──────────────────────┐
                    │   PostgreSQL         │
                    │   (Supabase)         │
                    │                      │
                    │  - Auth              │
                    │  - Storage           │
                    │  - Realtime          │
                    └──────────────────────┘
```

### Padrões Arquiteturais

- **Domain-Driven Design (DDD)** em módulos críticos (Tasks, Finance, Users, Conversations)
- **Repository Pattern** para abstração de dados
- **Use Case Pattern** para lógica de negócio
- **Clean Architecture** com separação de camadas
- **Event-Driven** com Event Emitters
- **CQRS** em operações complexas

---

## Stack Tecnológica

### Backend
- **Framework**: NestJS 11 com TypeScript 5.8
- **ORM**: Prisma 6.9
- **Database**: PostgreSQL (Supabase)
- **Cache**: Redis
- **Auth**: JWT + Passport
- **Real-time**: Socket.io
- **Scheduling**: Node-Cron, RRULE
- **Validation**: Class Validator

### Frontend
- **Framework**: Next.js 15
- **UI Library**: React 19
- **State Management**: Zustand
- **Auth**: Supabase Auth
- **Styling**: CSS Modules
- **Icons**: Lucide React
- **HTTP Client**: Custom API Client

### AI Service
- **Framework**: FastAPI
- **LLMs**: OpenAI, Anthropic
- **Vector**: Pinecone, Weaviate, Qdrant
- **Embeddings**: OpenAI text-embedding-3-small

### Infrastructure
- **Monorepo**: Turborepo
- **Package Manager**: pnpm 10
- **Build**: Vite, esbuild
- **CI/CD**: GitHub Actions (ready)
- **Deployment**: Vercel (Frontend) + Railway (Backend)

---

## Começando

### Pré-requisitos

```bash
# Node.js >= 20.0.0
node --version

# pnpm >= 10.0.0
pnpm --version

# Python >= 3.11 (para ai-service)
python --version

# PostgreSQL ou Supabase (recomendado)
```

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/susmi.git
cd susmi
```

2. **Instale as dependências**
```bash
pnpm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```bash
# Database (Supabase recomendado)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# JWT
JWT_SECRET="seu-secret-super-seguro"

# OpenAI (obrigatório para IA)
OPENAI_API_KEY="sk-..."

# Outros serviços (opcional)
ANTHROPIC_API_KEY="sk-ant-..."
GMAIL_CLIENT_ID="..."
GOOGLE_CALENDAR_CLIENT_ID="..."
```

4. **Configure o banco de dados**
```bash
# Gerar cliente Prisma
pnpm db:generate

# Executar migrations
pnpm db:push

# (Opcional) Popular com dados de exemplo
pnpm --filter @susmi/api db:seed
```

5. **Inicie o ambiente de desenvolvimento**
```bash
# Iniciar todos os serviços
pnpm dev

# Ou iniciar individualmente:
pnpm api:dev   # Backend (porta 3001)
pnpm web:dev   # Frontend (porta 3000)
pnpm ai:dev    # AI Service (porta 8001)
```

6. **Acesse a aplicação**
```
Frontend: http://localhost:3000
API: http://localhost:3001
AI Service: http://localhost:8001
Prisma Studio: pnpm db:studio
```

---

## Estrutura do Projeto

```
susmi/
├── apps/
│   ├── api/                    # Backend NestJS
│   │   ├── src/
│   │   │   ├── agents/         # Sistema de Agentes IA
│   │   │   ├── auth/           # Autenticação JWT
│   │   │   ├── automation/     # Motor de Automação
│   │   │   ├── calendar/       # Gerenciamento de Calendário
│   │   │   ├── communications/ # Email, WhatsApp, Telegram
│   │   │   ├── conversations/  # Chat com IA
│   │   │   ├── finance/        # Gestão Financeira (DDD)
│   │   │   ├── health/         # Saúde e Bem-estar
│   │   │   ├── home-automation/# Casa Inteligente
│   │   │   ├── knowledge/      # Base de Conhecimento (RAG)
│   │   │   ├── tasks/          # Gerenciamento de Tarefas (DDD)
│   │   │   ├── users/          # Gerenciamento de Usuários (DDD)
│   │   │   ├── voice/          # Interface de Voz
│   │   │   ├── audit/          # Auditoria e Governança
│   │   │   └── ...
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Schema do banco
│   │   │   └── migrations/     # Histórico de migrações
│   │   ├── railway.json        # Config Railway
│   │   ├── Procfile            # Config Procfile
│   │   └── package.json
│   │
│   ├── web/                    # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── login/      # Página de login
│   │   │   │   └── dashboard/  # Dashboard principal
│   │   │   │       ├── tasks/
│   │   │   │       ├── chat/
│   │   │   │       ├── agents/
│   │   │   │       ├── automations/
│   │   │   │       ├── calendar/
│   │   │   │       ├── communications/
│   │   │   │       ├── finance/
│   │   │   │       ├── health/
│   │   │   │       ├── home-automation/
│   │   │   │       ├── governance/
│   │   │   │       └── settings/
│   │   │   ├── components/     # Componentes React
│   │   │   ├── lib/            # Utilitários e hooks
│   │   │   └── styles/         # Estilos globais
│   │   └── package.json
│   │
│   └── ai-service/             # AI Service Python
│       ├── main.py             # FastAPI app
│       ├── requirements.txt
│       └── railway.json
│
├── packages/
│   └── shared/                 # Tipos e enums compartilhados
│       ├── src/
│       │   ├── enums/
│       │   └── types/
│       └── package.json
│
├── scripts/
│   ├── setup-deploy.sh         # Script de setup de deploy
│   └── README.md
│
├── .env.example                # Template de variáveis
├── .env.production             # Exemplo de produção
├── package.json                # Root package
├── pnpm-workspace.yaml         # Config do workspace
├── turbo.json                  # Config do Turborepo
├── vercel.json                 # Config Vercel
├── DEPLOY.md                   # Guia completo de deploy
├── DEPLOY_QUICKSTART.md        # Guia rápido de deploy
├── DEPLOY_CHECKLIST.md         # Checklist de deploy
└── README.md                   # Este arquivo
```

---

## Módulos e Recursos

### 🎯 Tasks Module (DDD)
Gerenciamento completo de tarefas com arquitetura Domain-Driven Design.

**Recursos:**
- CRUD completo de tarefas
- Prioridades (LOW, MEDIUM, HIGH, URGENT)
- Status customizáveis
- Subtarefas (hierarquia)
- Tags coloridas
- Filtros avançados
- Estatísticas e analytics

**Endpoints:**
- `POST /tasks` - Criar tarefa
- `GET /tasks` - Listar com filtros
- `PUT /tasks/:id` - Atualizar
- `PATCH /tasks/:id/toggle` - Toggle status
- `DELETE /tasks/:id` - Deletar
- `GET /tasks/stats` - Estatísticas

### 🤖 Agents Module
Sistema de agentes IA especializados que executam tarefas automaticamente.

**Tipos de Agentes:**
- Financial Analyst - Análise financeira
- Operational Manager - Gestão operacional
- Development Assistant - Assistência em desenvolvimento
- Scheduling Coordinator - Coordenação de agenda
- Security Monitor - Monitoramento de segurança
- Performance Analyst - Análise de performance

**Recursos:**
- Execução paralela ou sequencial
- Sistema de ferramentas (tools)
- Memória multinível (short/long term, episodic, semantic)
- Histórico de execuções
- Duplicação de agentes

### ⚙️ Automation Module
Motor de automação poderoso com workflows visuais.

**Triggers suportados:**
- TIME - Horário específico
- CRON - Expressões cron
- EVENT - Eventos do sistema
- WEBHOOK - HTTP webhooks
- DEVICE_STATE - Estado de dispositivos

**Recursos:**
- Condições lógicas (AND, OR, NOT)
- Ações encadeadas
- Cooldown para evitar loops
- Rate limiting
- Logs detalhados
- Workflows visuais

### 💰 Finance Module (DDD)
Gerenciamento financeiro completo com integração bancária.

**Recursos:**
- Múltiplas contas e cartões
- Sincronização automática (Open Banking)
- Categorização automática com IA
- Orçamentos com alertas
- Metas financeiras
- Transferências entre contas
- Relatórios e estatísticas
- Importação CSV

**Integrações:**
- Pluggy (Open Banking Brasil)
- Belvo (Open Banking América Latina)

### 📧 Communications Module
Hub de comunicações unificado.

**Canais suportados:**
- Email (Gmail OAuth2, SMTP/IMAP)
- WhatsApp Web
- Telegram Bot

**Recursos:**
- Agendamento de mensagens
- Análise de sentimento
- Resumo automático com IA
- Categorização inteligente
- Threads de email
- Histórico completo

### 📅 Calendar Module
Gerenciamento de calendário com IA.

**Integrações:**
- Google Calendar
- Microsoft Outlook

**Recursos:**
- Sincronização bidirecional
- Eventos recorrentes (RRULE)
- Attendees e reminders
- Otimização de rotas (Google Maps)
- Sugestões de eventos com IA
- Múltiplos calendários

### 🏠 Home Automation Module
Controle completo de casa inteligente.

**Protocolos:**
- Wi-Fi
- Zigbee
- Z-Wave
- Bluetooth
- MQTT
- HTTP

**Plataformas:**
- Tuya Smart
- Philips Hue
- Home Assistant
- Tasmota
- ESPHome

**Assistentes de Voz:**
- Amazon Alexa
- Google Home
- Apple Siri

**Recursos:**
- Cenas predefinidas
- Rotinas com triggers
- Agrupamento por sala
- Histórico de ações
- Controle de estado em tempo real

### 💊 Health & Wellness Module
Gerenciamento de saúde e bem-estar.

**Recursos:**
- Gerenciamento de medicamentos
- Lembretes automáticos (push, SMS, email, voz)
- Rastreamento de workouts
- Métricas de saúde
- Metas de saúde
- Análise de progresso

**Wearables suportados:**
- Fitbit
- Google Fit
- Garmin Connect
- Apple Health
- Strava
- Samsung Health
- Whoop
- Oura Ring
- Polar

### 📚 Knowledge Module (RAG)
Base de conhecimento com Retrieval-Augmented Generation.

**Recursos:**
- Upload de PDFs, URLs, textos
- Chunking e embeddings automáticos
- Vector search
- Perguntas com contexto
- Busca na web integrada
- Resumo automático

**Vector Databases:**
- Pinecone (padrão)
- Weaviate
- Qdrant

### 🎤 Voice Module
Interface de voz completa.

**Recursos:**
- Speech-to-Text (Whisper, Deepgram)
- Text-to-Speech (múltiplos providers)
- Wake word detection
- Detecção de idioma
- Clone de voz
- Streaming em tempo real (WebSocket)

### 🔒 Audit Module
Sistema de auditoria e governança.

**Recursos:**
- Rastreamento automático de ações
- Logs de CRUD
- IP e User Agent tracking
- Duração de requisições
- Dashboard de governança
- Filtros avançados

---

## Integrações

### IA e Machine Learning
- **OpenAI** - GPT-4, Whisper, Embeddings
- **Anthropic** - Claude
- **Pinecone** - Vector Database
- **Weaviate** - Vector Database alternativa
- **Qdrant** - Vector Database moderna

### Comunicações
- **Gmail API** - Email OAuth2
- **Microsoft Graph** - Outlook
- **WhatsApp Web** - Messaging
- **Telegram Bot API** - Messaging
- **Nodemailer** - SMTP/IMAP

### Calendário e Mapas
- **Google Calendar API** - Calendário
- **Microsoft Outlook** - Calendário
- **Google Maps API** - Rotas e geocoding

### Finanças
- **Pluggy** - Open Banking Brasil
- **Belvo** - Open Banking LATAM

### Saúde
- **Fitbit API**
- **Google Fit API**
- **Garmin Connect API**
- **Apple Health**
- **Strava API**
- **Samsung Health**

### Casa Inteligente
- **Tuya Cloud API**
- **Philips Hue API**
- **Home Assistant**
- **MQTT Protocol**
- **Amazon Alexa Skills**
- **Google Home Actions**
- **Apple HomeKit**

### Infraestrutura
- **Supabase** - Database, Auth, Storage
- **Upstash** - Redis Cache
- **Vercel** - Frontend Hosting
- **Railway** - Backend Hosting

---

## Deploy

O S.U.S.M.I está pronto para deploy em produção com configuração para:

- **Frontend**: Vercel
- **Backend API**: Railway
- **AI Service**: Railway
- **Database**: Supabase (PostgreSQL)

### Deploy Rápido (25 minutos)

```bash
# 1. Configure variáveis de ambiente automaticamente
bash scripts/setup-deploy.sh

# 2. Deploy na Railway (API + AI Service)
# - Acesse railway.app
# - Criar projeto → Deploy from GitHub
# - Adicionar variáveis de .env.railway.api e .env.railway.ai

# 3. Deploy na Vercel (Frontend)
# - Acesse vercel.com
# - Import project → Adicionar variáveis de .env.vercel.frontend

# Pronto!
```

### Documentação de Deploy

- **[Guia Completo](./DEPLOY.md)** - Instruções detalhadas passo a passo
- **[Quick Start](./DEPLOY_QUICKSTART.md)** - Deploy em 25 minutos
- **[Checklist](./DEPLOY_CHECKLIST.md)** - Checklist interativo
- **[Script de Setup](./scripts/README.md)** - Documentação do script

### Custos Estimados

- **Supabase**: Gratuito (até 500 MB)
- **Railway**: $5/mês grátis (suficiente para testes)
- **Vercel**: Gratuito (projetos pessoais)

**Total**: $0-10/mês

---

## Scripts Disponíveis

### Root (Monorepo)

```bash
pnpm dev              # Iniciar todos os serviços
pnpm build            # Build de todos os projetos
pnpm lint             # Lint em todos os projetos
pnpm test             # Testes em todos os projetos
pnpm clean            # Limpar builds e node_modules

# Serviços individuais
pnpm api:dev          # Apenas Backend API
pnpm web:dev          # Apenas Frontend
pnpm ai:dev           # Apenas AI Service

# Database
pnpm db:generate      # Gerar Prisma Client
pnpm db:push          # Push schema para database
pnpm db:migrate       # Criar migration
pnpm db:studio        # Abrir Prisma Studio
```

### Backend API

```bash
cd apps/api

pnpm dev              # Desenvolvimento com watch
pnpm build            # Build para produção
pnpm start            # Iniciar produção
pnpm start:prod       # Iniciar produção (alias)
pnpm lint             # ESLint
pnpm test             # Testes unitários
pnpm test:watch       # Testes em watch mode
pnpm test:cov         # Coverage
pnpm test:e2e         # Testes end-to-end

# Prisma
pnpm db:generate      # Gerar client
pnpm db:push          # Push schema
pnpm db:migrate       # Criar migration
pnpm db:seed          # Popular database
pnpm db:studio        # Prisma Studio
```

### Frontend

```bash
cd apps/web

pnpm dev              # Desenvolvimento
pnpm build            # Build para produção
pnpm start            # Iniciar servidor produção
pnpm lint             # Next.js lint
pnpm test             # Testes
```

### AI Service

```bash
cd apps/ai-service

python -m uvicorn main:app --reload --port 8001
```

---

## Documentação

### Guias
- [Guia de Deploy Completo](./DEPLOY.md)
- [Deploy Quick Start](./DEPLOY_QUICKSTART.md)
- [Checklist de Deploy](./DEPLOY_CHECKLIST.md)
- [Scripts de Deploy](./scripts/README.md)

### Configuração
- [Variáveis de Ambiente](./.env.example)
- [Configuração de Produção](./.env.production)

### API
- **Swagger/OpenAPI**: Disponível em `/api/docs` (em desenvolvimento)
- **Health Check**: `GET /api/health`

---

## Contribuindo

Contribuições são bem-vindas! Por favor, siga estas diretrizes:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código

- **TypeScript** - Use tipagem forte
- **ESLint** - Siga as regras do linter
- **Prettier** - Formatação consistente
- **Conventional Commits** - Mensagens de commit semânticas
- **DDD** - Domain-Driven Design em módulos críticos

---

## Roadmap

### v1.1 (Próximo)
- [ ] Modo offline com sincronização
- [ ] App mobile (React Native)
- [ ] Suporte a múltiplos idiomas
- [ ] Dashboard de analytics avançado
- [ ] Exportação de dados (GDPR compliance)

### v1.2
- [ ] Plugins customizados
- [ ] Marketplace de automações
- [ ] Integração com mais wearables
- [ ] OCR para documentos
- [ ] API pública com rate limiting

### v2.0
- [ ] Multi-tenancy
- [ ] White-label
- [ ] Federação de instâncias
- [ ] Blockchain para auditoria

---

## Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## Contato e Suporte

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/susmi/issues)
- **Discussões**: [GitHub Discussions](https://github.com/seu-usuario/susmi/discussions)
- **Email**: seu-email@exemplo.com

---

## Agradecimentos

Desenvolvido com inspiração em:
- JARVIS (Iron Man)
- Home Assistant
- n8n
- Notion
- Obsidian

Agradecimentos especiais a todas as bibliotecas e frameworks open-source que tornaram este projeto possível.

---

<p align="center">
  Feito com ❤️ e ☕ por [Seu Nome]
  <br>
  <sub>Versão 1.0.0 - Janeiro 2025</sub>
</p>
