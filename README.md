# S.U.S.M.I - Assistente Inteligente Pessoal

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node">
</p>

Um assistente inteligente pessoal inspirado no JARVIS, focado em automação e gerenciamento de atividades através de comandos de texto e IA.

## 🏗️ Arquitetura

```
susmi/
├── apps/
│   ├── api/              # NestJS Backend API
│   ├── web/              # Next.js Frontend
│   └── ai-service/       # FastAPI AI Service
├── packages/
│   └── shared/           # Tipos e utilitários compartilhados
└── ...
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js >= 20.0.0
- pnpm >= 10.0.0
- Python >= 3.11 (para ai-service)
- PostgreSQL (ou Supabase)

### Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Gerar cliente Prisma
pnpm db:generate

# Aplicar migrations
pnpm db:push

# Iniciar desenvolvimento
pnpm dev
```

## 📦 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia todos os serviços em modo desenvolvimento |
| `pnpm build` | Compila todos os projetos |
| `pnpm lint` | Executa linting em todos os projetos |
| `pnpm test` | Executa testes |
| `pnpm db:studio` | Abre Prisma Studio |

## 🔧 Stack Tecnológica

- **Backend**: NestJS + TypeScript + Prisma 7.2.0
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **AI Service**: FastAPI + Python
- **Database**: PostgreSQL (Supabase)
- **Cache**: Redis (Upstash)
- **Auth**: JWT + Supabase Auth

## 🚢 Deploy em Produção

O projeto está configurado para deploy em:

- **Backend API**: Railway (NestJS + Prisma)
- **AI Service**: Railway (FastAPI)
- **Frontend**: Vercel (Next.js)
- **Database**: Supabase (PostgreSQL)

### 📖 Guias de Deploy

- **[📖 Guia Completo](./DEPLOY.md)** - Instruções detalhadas passo a passo
- **[⚡ Quick Start](./DEPLOY_QUICKSTART.md)** - Deploy rápido em 25 minutos
- **[🔧 Script de Setup](./scripts/setup-deploy.sh)** - Automatiza configuração de variáveis

### ⚡ Deploy Rápido

```bash
# 1. Configure variáveis de ambiente automaticamente
bash scripts/setup-deploy.sh

# 2. Deploy na Railway (API + AI Service)
# - Criar projeto → Deploy from GitHub
# - Adicionar variáveis de .env.railway.api e .env.railway.ai

# 3. Deploy na Vercel (Frontend)
# - Import project → Adicionar variáveis de .env.vercel.frontend

# Pronto! 🎉
```

Veja [DEPLOY.md](./DEPLOY.md) para instruções completas.

## 📚 Documentação

- [📖 Guia Completo de Deploy](./DEPLOY.md)
- [⚡ Deploy Quick Start](./DEPLOY_QUICKSTART.md)
- [🔧 Scripts de Deploy](./scripts/README.md)
- [📝 Variáveis de Ambiente](./.env.production)

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.
