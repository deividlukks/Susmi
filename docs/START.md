# ⚡ Início Rápido - SUSMI

Este guia fornece instruções completas para configurar e executar o Susmi localmente.

---

## 📋 Pré-requisitos

- ✅ **Node.js** >= 22.0.0
- ✅ **pnpm** >= 9.0.0
- ✅ **PostgreSQL** (ou conta Supabase)
- ✅ **Redis** (opcional para desenvolvimento)
- ✅ **Python** >= 3.13 (para AI Service, opcional)

---

## 🚀 Iniciar Rapidamente (4 passos)

### 1️⃣ Instalar Dependências

```bash
# Clonar o repositório
git clone <repository-url>
cd susmi

# Instalar dependências Node.js
pnpm install
```

### 2️⃣ Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar o arquivo .env com suas configurações
```

**Variáveis Essenciais:**

```env
# Database (Supabase)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# JWT
JWT_SECRET=dev-secret-key-change-in-production

# API
API_PORT=4000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 3️⃣ Configurar Banco de Dados

```bash
# Gerar Prisma Client
pnpm db:generate

# Aplicar migrations
pnpm db:migrate
```

### 4️⃣ Iniciar Servidores

```bash
# Inicia API + Web de uma vez
pnpm dev
```

✅ **Pronto!** Acesse:

| Serviço | URL |
|---------|-----|
| 🌐 **Web App** | http://localhost:3000 |
| 🔷 **API** | http://localhost:4000 |
| 📚 **API Docs (Swagger)** | http://localhost:4000/docs |

---

## 📦 Comandos Úteis

### Desenvolvimento

```bash
pnpm dev              # Iniciar tudo em modo desenvolvimento
pnpm dev:web          # Iniciar apenas o Web (Next.js)
pnpm dev:api          # Iniciar apenas a API (NestJS)
pnpm typecheck        # Verificar tipos TypeScript
pnpm lint             # Executar linting
pnpm test             # Executar testes
pnpm format           # Formatar código
```

### Banco de Dados

```bash
pnpm db:studio        # Abre interface gráfica (Prisma Studio)
pnpm db:migrate       # Aplicar migrations (produção)
pnpm db:migrate:dev   # Criar e aplicar migrations (dev)
pnpm db:generate      # Gerar Prisma Client
pnpm db:push          # Empurrar schema para DB
pnpm db:reset         # Resetar banco de dados (CUIDADO!)
```

### Utilitários

```bash
pnpm create:admin                     # Criar usuário admin
pnpm create:admin email senha "Nome"  # Criar com dados diretos
pnpm build                            # Build para produção
pnpm clean                            # Limpar tudo
pnpm test:connection                  # Testar conexão com banco
```

---

## 🔴 Configurar Redis (Opcional)

O projeto pode usar Redis para cache. Escolha uma opção:

### Opção 1: Docker (Recomendado)

```bash
docker run -d -p 6379:6379 --name susmi-redis redis:alpine

# Verificar
redis-cli ping  # Deve retornar: PONG
```

### Opção 2: WSL2 (Windows)

```bash
# No WSL2
sudo apt update && sudo apt install redis-server
sudo service redis-server start
```

### Opção 3: Desabilitar Redis

Se não quiser usar Redis agora, comente temporariamente o RedisModule no `apps/api/src/app.module.ts`.

---

## 🔐 Criar Primeiro Usuário Admin

### Via Script (Recomendado)

```bash
pnpm create:admin

# Ou com parâmetros
pnpm create:admin admin@susmi.com Admin@123 "Administrador"
```

### Via API (curl)

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Administrador",
    "email": "admin@susmi.com",
    "password": "Admin@123",
    "role": "ADMIN"
  }'
```

---

## 🧪 Testar a Aplicação

### 1. Verificar Health da API

```bash
curl http://localhost:4000/api
```

Ou abra no navegador: http://localhost:4000/docs

### 2. Testar Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@susmi.com",
    "password": "Admin@123"
  }'
```

### 3. Acessar o Frontend

1. Abra: http://localhost:3000
2. Faça login com o usuário criado
3. Explore o dashboard

### 4. Acessar Painel Admin

Se você criou um usuário com role ADMIN:
- Acesse: http://localhost:3000/admin/users

### 5. Visualizar Banco de Dados

```bash
pnpm db:studio
```

Acesse: http://localhost:5555

---

## ⚡ Fluxo Recomendado

### Primeira Vez

```bash
# 1. Instalar dependências
pnpm install

# 2. Gerar Prisma Client
pnpm db:generate

# 3. Aplicar migrations
pnpm db:migrate

# 4. Iniciar servidores
pnpm dev

# 5. Criar usuário admin (em outro terminal)
pnpm create:admin
```

### Desenvolvimento Diário

```bash
pnpm dev
```

### Após Mudar o schema.prisma

```bash
pnpm db:push
# OU
pnpm db:migrate:dev --name nome_da_mudanca
```

---

## 🐛 Troubleshooting

### Erro: "Can't reach database server"

```bash
# Verificar conexão com Supabase
cd apps/api
pnpm prisma db pull
```

- Verifique se a URL do banco está correta no `.env`
- Verifique se o IP está liberado no Supabase

### Erro: "Redis connection refused"

```bash
# Verificar se Redis está rodando
redis-cli ping
```

Se não quiser usar Redis, comente temporariamente o RedisModule.

### Erro: "Port already in use"

```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

### Erro: Migrations Pendentes

```bash
cd apps/api

# Ver status das migrations
pnpm prisma migrate status

# Aplicar migrations pendentes
pnpm prisma migrate deploy
```

### Erro de TypeScript no Build

```bash
# Limpar cache e reinstalar
pnpm clean
pnpm install

# Regenerar Prisma Client
cd apps/api
pnpm prisma generate
```

### Erro no Prisma Client

```bash
pnpm db:generate
```

---

## 🎯 Primeiros Passos Após Setup

1. ✅ Criar usuário admin: `pnpm create:admin`
2. ✅ Acessar http://localhost:3000
3. ✅ Fazer login
4. ✅ Criar tarefas, eventos, hábitos
5. ✅ Explorar o dashboard e analytics

---

## 📱 URLs de Referência

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000/api |
| API Docs (Swagger) | http://localhost:4000/docs |
| Prisma Studio | http://localhost:5555 |
| Supabase Dashboard | https://supabase.com/dashboard |

---

## ✅ Checklist de Inicialização

- [ ] Node.js >= 22.0.0 instalado
- [ ] pnpm >= 9.0.0 instalado
- [ ] Variáveis de ambiente configuradas
- [ ] Dependências instaladas (`pnpm install`)
- [ ] Prisma Client gerado (`pnpm db:generate`)
- [ ] Migrations aplicadas (`pnpm db:migrate`)
- [ ] API rodando na porta 4000
- [ ] Web rodando na porta 3000
- [ ] Usuário admin criado
- [ ] Login funcionando
- [ ] Redis rodando (opcional)

---

## 📚 Próximos Passos

Consulte a documentação completa:

- **[ARQUITETURA.md](./ARQUITETURA.md)** - Arquitetura detalhada do sistema
- **[DEPLOY.md](./DEPLOY.md)** - Deploy em produção
- **[AUDITORIA.md](./AUDITORIA.md)** - Auditoria de conformidade

---

**Pronto! Agora você tem o SUSMI rodando localmente! 🎉**
