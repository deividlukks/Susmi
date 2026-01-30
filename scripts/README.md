# Scripts de Deploy

Scripts auxiliares para facilitar o deploy do S.U.S.M.I.

## 📝 Scripts Disponíveis

### `setup-deploy.sh`

Script interativo para configurar variáveis de ambiente para deploy.

**O que faz:**
- Solicita credenciais do Supabase
- Solicita API keys (OpenAI, Anthropic)
- Solicita URLs dos serviços
- Gera JWT secret automaticamente
- Cria arquivos `.env` separados para cada serviço

**Como usar:**

```bash
# Linux/Mac
./scripts/setup-deploy.sh

# Windows (Git Bash)
bash scripts/setup-deploy.sh
```

**Resultado:**
- `.env.railway.api` - Variáveis para o serviço API no Railway
- `.env.railway.ai` - Variáveis para o AI Service no Railway
- `.env.vercel.frontend` - Variáveis para o Frontend na Vercel

**Importante:** Estes arquivos contêm informações sensíveis! Não os commite no Git.

---

## 🔒 Segurança

Todos os arquivos `.env.*` gerados pelos scripts são automaticamente ignorados pelo Git (ver `.gitignore`).

**Nunca commite:**
- `.env.railway.*`
- `.env.vercel.*`
- `.env.production`
- Qualquer arquivo contendo API keys ou secrets

---

## 📚 Mais Informações

- [DEPLOY.md](../DEPLOY.md) - Guia completo de deploy
- [DEPLOY_QUICKSTART.md](../DEPLOY_QUICKSTART.md) - Guia rápido
