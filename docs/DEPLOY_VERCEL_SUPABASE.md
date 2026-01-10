# 🚀 Deploy na Vercel com Supabase

Este guia explica como fazer o deploy do Susmi na Vercel utilizando o Supabase como banco de dados.

## 📋 Pré-requisitos

- Conta na [Vercel](https://vercel.com)
- Conta na [Supabase](https://supabase.com)
- Repositório Git conectado ao Vercel

---

## 1️⃣ Configurar o Supabase

### 1.1 Criar um novo projeto

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique em **New Project**
3. Preencha:
   - **Name**: `susmi-production` (ou o nome desejado)
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

## 2️⃣ Configurar a Vercel

### 2.1 Importar o projeto

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Selecione o repositório do Susmi
3. Configure o projeto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` (para monorepo)
   - **Build Command**: `pnpm build`
   - **Install Command**: `pnpm install`

### 2.2 Configurar variáveis de ambiente

Em **Settings** → **Environment Variables**, adicione:

| Variável | Valor | Ambientes |
|----------|-------|-----------|
| `NEXT_PUBLIC_API_URL` | URL da sua API backend | Production, Preview |
| `NEXT_PUBLIC_PYTHON_SERVICE_URL` | URL do serviço de IA (opcional) | Production, Preview |
| `NEXT_PUBLIC_APP_NAME` | `Susmi` | All |

### 2.3 Deploy

Clique em **Deploy** e aguarde o build completar.

---

## 3️⃣ Deploy da API (Backend NestJS)

A API NestJS precisa ser hospedada separadamente. Opções recomendadas:

### Opção A: Railway

1. Acesse [railway.app](https://railway.app)
2. Crie um novo projeto
3. Conecte o repositório
4. Configure o diretório: `apps/api`
5. Adicione as variáveis de ambiente:

```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
JWT_SECRET=sua-chave-secreta-muito-segura
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGINS=https://seu-dominio-vercel.vercel.app
NODE_ENV=production
```

### Opção B: Render

1. Acesse [render.com](https://render.com)
2. Crie um **Web Service**
3. Configure:
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm build`
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

## 5️⃣ Variáveis de Ambiente Completas

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://api.susmi.app/api
NEXT_PUBLIC_PYTHON_SERVICE_URL=https://ai.susmi.app/api
NEXT_PUBLIC_APP_NAME=Susmi
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Backend (Railway/Render/Fly.io)

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[pass]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# Redis (Upstash recomendado)
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

## 6️⃣ Serviços Recomendados

| Serviço | Provedor Recomendado | Tier Gratuito |
|---------|---------------------|---------------|
| Frontend | Vercel | ✅ Sim |
| Backend API | Railway / Render | ✅ Sim (limitado) |
| Banco de Dados | Supabase | ✅ Sim (500MB) |
| Redis/Cache | Upstash | ✅ Sim (10K/dia) |
| AI Service | Railway / Render | ✅ Sim |

---

## 7️⃣ Checklist de Deploy

- [ ] Criar projeto no Supabase
- [ ] Copiar connection strings
- [ ] Configurar projeto na Vercel
- [ ] Adicionar variáveis de ambiente na Vercel
- [ ] Deploy do frontend na Vercel
- [ ] Deploy da API (Railway/Render/Fly.io)
- [ ] Adicionar variáveis de ambiente na API
- [ ] Executar migrações do Prisma
- [ ] Configurar Redis (Upstash)
- [ ] Testar endpoints
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

- Verifique se o Root Directory está correto: `apps/web`
- Confirme que `pnpm` está sendo usado

---

## 📚 Links Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Supabase](https://supabase.com/docs)
- [Prisma com Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [Railway Docs](https://docs.railway.app)

---

*Última atualização: Janeiro 2026*
