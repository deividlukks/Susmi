# 🚀 Guia de Inicialização Local - SUSMI

## 📋 Pré-requisitos

- ✅ Node.js >= 22.0.0
- ✅ PNPM >= 9.0.0
- ✅ Redis (para cache e filas)
- ✅ Conta Supabase configurada

## 🔧 Configuração Inicial

### 1. Variáveis de Ambiente

Seu projeto já está configurado com Supabase! Verifique se os arquivos `.env` estão corretos:

#### **apps/api/.env** (Backend)
```env
# Database Supabase (já configurado)
DATABASE_URL=postgresql://postgres:pqfhTNnJFcXb2FnF@db.arjhpinnqfwljbevvhyy.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:pqfhTNnJFcXb2FnF@db.arjhpinnqfwljbevvhyy.supabase.co:5432/postgres

# API
API_PORT=4000
API_HOST=0.0.0.0

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=dev-secret-key-smart-planner-2026-change-in-production
```

#### **apps/web/.env** (Frontend)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

### 2. Instalar Dependências

```bash
# Na raiz do projeto
pnpm install
```

## 🗄️ Configurar Banco de Dados (Supabase)

### 1. Testar Conexão com Supabase

```bash
cd apps/api
pnpm prisma db pull
```

Se conectar com sucesso, você verá uma mensagem de confirmação.

### 2. Executar Migrations (Criar Tabelas)

```bash
# Aplicar migrations ao Supabase
cd apps/api
pnpm prisma migrate deploy

# OU criar nova migration (desenvolvimento)
pnpm prisma migrate dev --name init
```

### 3. Gerar Prisma Client

```bash
cd apps/api
pnpm prisma generate
```

### 4. (Opcional) Visualizar Banco de Dados

```bash
cd apps/api
pnpm prisma studio
```

Isso abrirá uma interface web em `http://localhost:5555` para visualizar suas tabelas.

## 🔴 Iniciar Redis (Obrigatório)

O projeto precisa do Redis para cache e filas. Escolha uma opção:

### Opção 1: Redis com Docker (Recomendado)

```bash
docker run -d -p 6379:6379 --name susmi-redis redis:alpine
```

### Opção 2: Redis Local (Windows)

1. Baixe o Redis para Windows: https://github.com/microsoftarchive/redis/releases
2. Instale e inicie o serviço
3. Ou use WSL2:

```bash
# No WSL2
sudo service redis-server start
```

### Opção 3: Desabilitar Redis (temporário)

Se não quiser usar Redis agora, você pode comentar temporariamente no código.

**Verificar se Redis está rodando:**

```bash
redis-cli ping
# Deve retornar: PONG
```

## ▶️ Iniciar os Servidores

### Opção 1: Iniciar Todos de Uma Vez (Turborepo)

```bash
# Na raiz do projeto
pnpm dev
```

Isso inicia:
- 🔷 **API (NestJS)**: http://localhost:4000
- 🌐 **Web (Next.js)**: http://localhost:3000
- 📚 **API Docs**: http://localhost:4000/docs

### Opção 2: Iniciar Separadamente

#### Terminal 1 - API Backend

```bash
cd apps/api
pnpm dev
```

Aguarde a mensagem:
```
🚀 API rodando em:
   • Local: http://localhost:4000/api
📚 Documentação disponível em:
   • Local: http://localhost:4000/docs
```

#### Terminal 2 - Web Frontend

```bash
cd apps/web
pnpm dev
```

Aguarde a mensagem:
```
✓ Ready in X ms
  - Local:   http://localhost:3000
```

#### Terminal 3 - AI Service (Opcional - Python)

```bash
cd apps/ai-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

## 🧪 Testar a Conexão

### 1. Verificar Health da API

```bash
curl http://localhost:4000/api
```

Ou abra no navegador: http://localhost:4000/docs

### 2. Testar Registro de Usuário

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin Test",
    "email": "admin@test.com",
    "password": "admin123",
    "role": "ADMIN"
  }'
```

### 3. Testar Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'
```

### 4. Verificar Banco de Dados no Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Table Editor**
4. Verifique se as tabelas foram criadas:
   - `users`
   - `tasks`
   - `events`
   - `reminders`
   - etc.

### 5. Acessar o Frontend

Abra o navegador em: http://localhost:3000

Faça login com o usuário criado acima.

### 6. Acessar Painel Admin

Se você criou um usuário com role ADMIN:

1. Acesse: http://localhost:3000/admin/users
2. Você deverá ver o painel de gestão de usuários

## 🐛 Troubleshooting

### Erro: "Can't reach database server"

```bash
# Verificar se o Supabase está acessível
ping db.arjhpinnqfwljbevvhyy.supabase.co

# Testar conexão direta
cd apps/api
npx prisma db pull
```

### Erro: "Redis connection refused"

```bash
# Verificar se Redis está rodando
redis-cli ping

# Ou desabilitar Redis temporariamente
# Comente a importação do RedisModule em apps/api/src/app.module.ts
```

### Erro: "Port 4000 already in use"

```bash
# Windows - Verificar o que está usando a porta
netstat -ano | findstr :4000

# Matar o processo (substitua PID)
taskkill /PID <PID> /F

# Ou alterar a porta no .env
API_PORT=4001
```

### Migrations Pendentes

```bash
cd apps/api

# Ver status das migrations
pnpm prisma migrate status

# Aplicar migrations pendentes
pnpm prisma migrate deploy

# Resetar database (CUIDADO: apaga tudo!)
pnpm prisma migrate reset
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

## 📊 Monitoramento

### Logs em Tempo Real

**API:**
```bash
cd apps/api
pnpm dev
```

**Web:**
```bash
cd apps/web
pnpm dev
```

### Verificar Prisma Studio

```bash
cd apps/api
pnpm prisma studio
```

Acesse: http://localhost:5555

## 🔐 Criar Primeiro Usuário Admin

### Via API (curl):

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Administrator",
    "email": "admin@susmi.com",
    "password": "Admin@123",
    "role": "ADMIN"
  }'
```

### Via Prisma Studio:

1. `pnpm prisma studio` na pasta `apps/api`
2. Abra a tabela `users`
3. Clique em "Add record"
4. Preencha os campos (senha deve ser hash bcrypt)
5. Defina `role` como `ADMIN`

### Via Telegram Bot (se configurado):

Envie no Telegram:
```
/criar admin@susmi.com Admin@123 Administrator
```

## ✅ Checklist de Inicialização

- [ ] Redis rodando
- [ ] Variáveis de ambiente configuradas
- [ ] Dependências instaladas (`pnpm install`)
- [ ] Prisma Client gerado (`pnpm prisma generate`)
- [ ] Migrations aplicadas (`pnpm prisma migrate deploy`)
- [ ] API rodando na porta 4000
- [ ] Web rodando na porta 3000
- [ ] Usuário admin criado
- [ ] Login funcionando
- [ ] Painel admin acessível

## 🎯 URLs Úteis

- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api
- **API Docs (Swagger)**: http://localhost:4000/docs
- **Prisma Studio**: http://localhost:5555
- **Supabase Dashboard**: https://supabase.com/dashboard

## 🔄 Scripts Úteis

```bash
# Instalar tudo
pnpm install

# Iniciar tudo em dev
pnpm dev

# Build de produção
pnpm build

# Typecheck
pnpm typecheck

# Linting
pnpm lint

# Testes
cd apps/api && pnpm test

# Limpar tudo
pnpm clean
```

## 📝 Próximos Passos

1. ✅ Testar fluxo completo de autenticação
2. ✅ Criar alguns usuários de teste
3. ✅ Testar CRUD de tarefas
4. ✅ Testar CRUD de eventos
5. ✅ Configurar Telegram Bot (opcional)
6. ✅ Testar serviço de IA (opcional)

---

**Pronto! Agora você tem o SUSMI rodando localmente com Supabase! 🎉**
