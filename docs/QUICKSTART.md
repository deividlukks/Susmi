# Susmi - Guia de Início Rápido

Este guia fornece instruções rápidas para colocar o Susmi em funcionamento em poucos minutos.

## ⚡ Instalação Rápida

### Pré-requisitos

- Node.js >= 22.0.0
- PNPM >= 9.0.0
- Python >= 3.13
- PostgreSQL 18
- Redis

### Passo 1: Instalar Dependências

```bash
# Clonar o repositório
git clone <repository-url>
cd susmi

# Instalar dependências Node.js
pnpm install

# Instalar dependências Python
cd services/ai-service
python3.13 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

### Passo 2: Configurar Banco de Dados

```bash
# Criar banco de dados PostgreSQL
createdb smart_planner

# Ou via psql
psql -U postgres -c "CREATE DATABASE smart_planner;"

# Executar migrations
cd services/api
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL
pnpm prisma migrate dev
pnpm prisma generate
cd ../..
```

### Passo 3: Configurar Variáveis de Ambiente

**Backend (services/api/.env):**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/smart_planner"
JWT_SECRET=your-secret-key-change-in-production
REDIS_HOST=localhost
REDIS_PORT=6379
API_PORT=3001
CORS_ORIGINS=http://localhost:3000
```

**Python (services/ai-service/.env):**
```env
API_HOST=0.0.0.0
API_PORT=8000
NESTJS_API_URL=http://localhost:3001/api
```

**Frontend (apps/web/.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_PYTHON_SERVICE_URL=http://localhost:8000/api
```

### Passo 4: Iniciar Serviços

```bash
# Na raiz do projeto
pnpm dev
```

Isso iniciará:
- ✅ Frontend Next.js em http://localhost:3000
- ✅ Backend NestJS em http://localhost:3001
- ✅ Serviço Python em http://localhost:8000

### Passo 5: Acessar a Aplicação

Abra seu navegador em **http://localhost:3000**

## 📚 Recursos Disponíveis

- **Frontend**: http://localhost:3000
- **API Backend**: http://localhost:3001/api
- **Documentação API (Swagger)**: http://localhost:3001/docs
- **Serviço Python**: http://localhost:8000
- **Prisma Studio**: `cd services/api && pnpm prisma studio`

## 🎯 Primeiros Passos

### 1. Criar Conta

Acesse http://localhost:3000 e clique em "Registrar" para criar sua conta.

### 2. Criar Primeira Tarefa

1. Faça login
2. Vá para "Tarefas"
3. Clique em "Nova Tarefa"
4. Preencha título, prioridade e data de vencimento
5. Salve

### 3. Criar Evento no Calendário

1. Vá para "Calendário"
2. Clique em "Novo Evento"
3. Preencha os detalhes
4. Configure lembretes se desejar
5. Salve

### 4. Visualizar Relatórios

1. Vá para "Analytics"
2. Visualize suas métricas de produtividade
3. Confira relatórios semanais e mensais

## 🔧 Comandos Úteis

```bash
# Build de produção
pnpm build

# Executar testes
pnpm test

# Verificar tipos
pnpm typecheck

# Formatar código
pnpm format

# Limpar tudo
pnpm clean

# Prisma Studio (visualizar banco de dados)
cd services/api && pnpm prisma studio
```

## 🐛 Solução de Problemas

### Erro de conexão com PostgreSQL

Verifique se o PostgreSQL está rodando:
```bash
# Linux/Mac
sudo systemctl status postgresql

# Ou tente conectar manualmente
psql -U postgres -d smart_planner
```

### Erro de conexão com Redis

Verifique se o Redis está rodando:
```bash
# Linux/Mac
sudo systemctl status redis

# Ou inicie manualmente
redis-server
```

### Porta já em uso

Se alguma porta estiver em uso, você pode alterar nas variáveis de ambiente:
- Backend: `API_PORT` em `services/api/.env`
- Python: `API_PORT` em `services/ai-service/.env`
- Frontend: `PORT` ou execute `PORT=3001 pnpm dev`

### Erro ao instalar dependências

```bash
# Limpar cache do PNPM
pnpm store prune

# Reinstalar
rm -rf node_modules
pnpm install
```

## 📖 Documentação Completa

Para documentação detalhada, consulte [DOCUMENTATION.md](./DOCUMENTATION.md)

## 🆘 Precisa de Ajuda?

- Consulte a [documentação completa](./DOCUMENTATION.md)
- Verifique os logs dos serviços
- Abra uma issue no repositório

---

**Pronto! Você está pronto para usar o Susmi! 🚀**
