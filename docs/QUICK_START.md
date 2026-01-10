# ⚡ Quick Start - SUSMI

## 🚀 Iniciar Rapidamente (3 passos)

### 1️⃣ Instalar Dependências
```bash
pnpm install
```

### 2️⃣ Configurar Banco de Dados (Supabase)
```bash
# Gerar Prisma Client
pnpm db:generate

# Aplicar migrations (se necessário)
pnpm db:migrate
```

### 3️⃣ Iniciar Servidores
```bash
# Inicia API + Web de uma vez
pnpm dev
```

✅ **Pronto!** Acesse:
- 🌐 **Web**: http://localhost:3000
- 🔷 **API**: http://localhost:4000
- 📚 **Docs**: http://localhost:4000/docs

---

## 📦 Comandos Úteis

### Desenvolvimento
```bash
# Iniciar tudo em modo desenvolvimento
pnpm dev

# Iniciar apenas a API
cd apps/api && pnpm dev

# Iniciar apenas o Web
cd apps/web && pnpm dev

# Verificar tipos TypeScript
pnpm typecheck

# Executar linting
pnpm lint

# Executar testes
pnpm test
```

### Banco de Dados (Supabase)
```bash
# Testar conexão e ver dados
pnpm db:studio                # Abre interface gráfica

# Migrations
pnpm db:migrate              # Aplicar migrations (produção)
pnpm db:migrate:dev          # Criar e aplicar migrations (dev)
pnpm db:generate             # Gerar Prisma Client

# Sincronizar schema
pnpm db:push                 # Empurrar schema para DB
pnpm db:pull                 # Puxar schema do DB

# Reset (CUIDADO: apaga tudo!)
pnpm db:reset                # Resetar banco de dados
```

### Utilitários
```bash
# Testar todas as conexões
pnpm test:connection

# Criar usuário admin
pnpm create:admin

# Ou com dados diretos
pnpm create:admin admin@susmi.com Admin@123 "Administrator"

# Build para produção
pnpm build

# Limpar tudo
pnpm clean
```

---

## 🗄️ Supabase - Status

✅ **Conectado!**
- **Database**: PostgreSQL
- **Tabelas**: 7 tabelas criadas
  - users
  - user_preferences
  - tasks
  - task_categories
  - events
  - event_reminders
  - reminders

⚠️ **Nota sobre RLS (Row Level Security)**
O Supabase usa RLS por padrão. Se tiver problemas com permissões:
1. Acesse o Supabase Dashboard
2. Vá em "Authentication" → "Policies"
3. Desabilite RLS temporariamente para desenvolvimento

---

## ⚡ Fluxo Recomendado

### Primeira Vez:
```bash
# 1. Instalar
pnpm install

# 2. Gerar Prisma Client
pnpm db:generate

# 3. Verificar banco de dados
pnpm db:studio

# 4. Iniciar servidores
pnpm dev

# 5. Criar usuário admin (em outro terminal)
pnpm create:admin
```

### Desenvolvimento Diário:
```bash
# Apenas iniciar
pnpm dev
```

### Após mudar o schema.prisma:
```bash
# Aplicar mudanças no banco
pnpm db:push

# OU criar migration
pnpm db:migrate:dev --name nome_da_mudanca
```

---

## 🔧 Troubleshooting Rápido

### "Can't reach database server"
```bash
# Verificar conexão
ping db.arjhpinnqfwljbevvhyy.supabase.co

# Testar com Prisma
pnpm db:pull
```

### "Port already in use"
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

### Migrations pendentes
```bash
pnpm db:migrate
```

### Erro no Prisma Client
```bash
pnpm db:generate
```

---

## 📱 Acessar Aplicação

1. **Web**: http://localhost:3000
   - Login com usuário criado
   - Se for ADMIN: acesse http://localhost:3000/admin/users

2. **API Docs (Swagger)**: http://localhost:4000/docs
   - Tester todos os endpoints
   - Ver schemas

3. **Prisma Studio**: http://localhost:5555
   - Ver e editar dados do banco
   - Execute: `pnpm db:studio`

---

## 🎯 Próximos Passos

1. ✅ Criar usuário admin: `pnpm create:admin`
2. ✅ Acessar http://localhost:3000
3. ✅ Fazer login
4. ✅ Testar painel admin em /admin/users
5. ✅ Criar tarefas, eventos, lembretes

---

**Dúvidas?** Consulte o [SETUP_LOCAL.md](./SETUP_LOCAL.md) para o guia completo.
