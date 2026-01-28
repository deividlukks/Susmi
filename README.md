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

- **Backend**: Railway (NestJS API)
- **Frontend**: Vercel (Next.js)
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash (Redis)

### Guias de Deploy

- **[📖 Guia Completo de Deploy](./docs/DEPLOYMENT.md)** - Passo a passo detalhado
- **[⚡ Quick Start Deploy](./docs/DEPLOY_QUICKSTART.md)** - Deploy rápido em 10 passos

### Configuração Rápida

1. **Supabase**: Criar database PostgreSQL
2. **Upstash**: Criar Redis database
3. **Railway**: Deploy backend (variáveis em `.env.railway`)
4. **Vercel**: Deploy frontend (variáveis em `.env.vercel`)

Veja os arquivos `.env.production.example` em cada app para referência completa.

## 📚 Documentação

- [Guia de Deploy](./docs/DEPLOYMENT.md)
- [Quick Start Deploy](./docs/DEPLOY_QUICKSTART.md)
- [Relatório de Refatoração](./docs/REFACTORING_REPORT.md)

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.
