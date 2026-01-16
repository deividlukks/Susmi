# 🚀 Deploy do Susmi

Este guia explica como fazer o deploy do Susmi em produção utilizando **Vercel** (Frontend), **Railway/Render** (Backend), e **Supabase** (Database).

---

## 📋 Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Conta na [Supabase](https://supabase.com)
- Conta na [Railway](https://railway.app) ou [Render](https://render.com)
- Conta na [Upstash](https://upstash.com) (para Redis)
- Repositório Git conectado

---

## 1️⃣ Configurar o Supabase (Database)

### 1.1 Criar um novo projeto

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique em **New Project**
3. Preencha:
   - **Name**: `susmi-production`
   - **Database Password**: Gere uma senha forte e **guarde-a**
   - **Region**: Selecione a mais próxima (ex: `South America (São Paulo)`)
4. Clique em **Create new project**

### 1.2 Obter as Connection Strings

1. Vá em **Settings** → **Database**
2. Role até **Connection string**
3. Copie as duas URLs:

**Transaction Mode (porta 6543)** - Use para `DATABASE_URL`:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**Session Mode (porta 5432)** - Use para `DIRECT_URL`:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

> ⚠️ **Importante**: A `DIRECT_URL` é necessária para rodar migrações do Prisma.

---

## 2️⃣ Configurar o Redis (Upstash)

### 2.1 Criar database Redis

1. Acesse [console.upstash.com](https://console.upstash.com)
2. Clique em **Create Database**
3. Configure:
   - **Name**: `susmi-cache`
   - **Region**: Próxima do seu banco Supabase
   - **Type**: Regional
4. Copie as credenciais:
   - Host
   - Port
   - Password

### 2.2 Configuração no .env

```env
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_TTL=3600
```

---

## 3️⃣ Deploy do Backend (API NestJS)

A API NestJS precisa ser hospedada em um serviço que suporte Node.js.

### Opção A: Railway (Recomendado)

1. Acesse [railway.app](https://railway.app)
2. Crie um novo projeto
3. Conecte o repositório
4. Configure:
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm prisma generate && pnpm build`
   - **Start Command**: `pnpm start:prod`

5. Adicione as variáveis de ambiente:

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# Redis (Upstash)
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=sua-chave-secreta-muito-segura-32-caracteres
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# API
API_PORT=3001
CORS_ORIGINS=https://seu-dominio-vercel.vercel.app
NODE_ENV=production
```

### Opção B: Render

1. Acesse [render.com](https://render.com)
2. Crie um **Web Service**
3. Configure:
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm prisma generate && pnpm build`
   - **Start Command**: `pnpm start:prod`

### Opção C: Fly.io

```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh

# Na pasta apps/api
cd apps/api
fly launch
fly secrets set DATABASE_URL="..."
fly secrets set JWT_SECRET="..."
fly deploy
```

---

## 4️⃣ Executar Migrações do Prisma

Após configurar o banco, execute as migrações:

### Localmente (recomendado para primeira vez)

```bash
# Na pasta apps/api
cd apps/api

# Configurar variáveis de ambiente
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."

# Executar migrações
pnpm prisma migrate deploy

# Gerar o client
pnpm prisma generate
```

### Via CI/CD

Adicione ao seu pipeline:

```yaml
- name: Run Migrations
  run: |
    cd apps/api
    npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    DIRECT_URL: ${{ secrets.DIRECT_URL }}
```

---

## 5️⃣ Deploy do Frontend (Vercel)

### 5.1 Importar o projeto

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Selecione o repositório do Susmi
3. O arquivo `vercel.json` já configura:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (raiz do monorepo)
   - **Build Command**: `npx turbo run build --filter=@susmi/web-app`
   - **Output Directory**: `apps/web-app/.next`
   - **Install Command**: `pnpm install`

### 5.2 Configurar variáveis de ambiente

Em **Settings** → **Environment Variables**, adicione:

| Variável | Valor | Ambientes |
|----------|-------|-----------|
| `NEXT_PUBLIC_API_URL` | URL do backend (ex: `https://api.susmi.app/api`) | Production, Preview |
| `NEXT_PUBLIC_APP_NAME` | `Susmi` | All |
| `NEXT_PUBLIC_APP_VERSION` | `1.0.0` | All |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do Supabase | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon Key do Supabase | Production, Preview |

### 5.3 Deploy

Clique em **Deploy** e aguarde o build completar.

---

## 6️⃣ Variáveis de Ambiente - Resumo Completo

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://api.susmi.app/api
NEXT_PUBLIC_PYTHON_SERVICE_URL=https://ai.susmi.app/api
NEXT_PUBLIC_APP_NAME=Susmi
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiI...
```

### Backend (Railway/Render)

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[pass]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# Redis (Upstash)
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=gere-uma-chave-segura-com-32-caracteres-minimo
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# API
API_PORT=3001
CORS_ORIGINS=https://susmi.vercel.app,https://www.susmi.app
NODE_ENV=production
```

---

## 7️⃣ Serviços Recomendados

| Serviço | Provedor Recomendado | Tier Gratuito |
|---------|---------------------|---------------|
| Frontend | Vercel | ✅ Sim |
| Backend API | Railway / Render | ✅ Sim (limitado) |
| Banco de Dados | Supabase | ✅ Sim (500MB) |
| Redis/Cache | Upstash | ✅ Sim (10K/dia) |
| AI Service | Railway / Render | ✅ Sim |

---

## 8️⃣ Checklist de Deploy

### Supabase
- [ ] Criar projeto no Supabase
- [ ] Copiar connection strings
- [ ] Executar migrações do Prisma

### Redis
- [ ] Criar database no Upstash
- [ ] Copiar credenciais

### Backend
- [ ] Deploy da API (Railway/Render)
- [ ] Adicionar variáveis de ambiente
- [ ] Verificar logs de inicialização

### Frontend
- [ ] Configurar projeto na Vercel
- [ ] Adicionar variáveis de ambiente
- [ ] Deploy do frontend

### Validação
- [ ] Testar endpoints da API
- [ ] Testar login no frontend
- [ ] Verificar CORS
- [ ] Configurar domínio customizado (opcional)

---

## 🔧 Troubleshooting

### Erro: "Can't reach database server"

- Verifique se o IP está liberado no Supabase (Settings → Database → Network)
- Use `?pgbouncer=true` na DATABASE_URL

### Erro: "Prisma migration failed"

- Certifique-se de que `DIRECT_URL` está configurada (usa porta 5432)
- Verifique se a senha não tem caracteres especiais não escapados

### Erro: "CORS blocked"

- Adicione o domínio da Vercel em `CORS_ORIGINS` na API
- Reinicie o serviço da API após alterar

### Build falha na Vercel

- Verifique se `pnpm` está sendo usado
- Confirme que o `vercel.json` está correto

### Erro: "Redis connection refused"

- Verifique as credenciais do Upstash
- Certifique-se de que `REDIS_HOST`, `REDIS_PORT` e `REDIS_PASSWORD` estão corretos

---

## 📚 Links Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Prisma com Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Railway Docs](https://docs.railway.app)
- [Upstash Docs](https://docs.upstash.com)

---

*Última atualização: Janeiro 2026*
