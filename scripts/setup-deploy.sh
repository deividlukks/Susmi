#!/bin/bash

# Script de setup para deploy do S.U.S.M.I
# Este script ajuda a configurar as variáveis de ambiente necessárias

set -e

echo "🚀 S.U.S.M.I - Setup de Deploy"
echo "================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para gerar JWT secret
generate_jwt_secret() {
    if command -v openssl &> /dev/null; then
        openssl rand -base64 32
    else
        echo "$(date +%s | sha256sum | base64 | head -c 32)"
    fi
}

# Verificar se está na raiz do projeto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script da raiz do projeto${NC}"
    exit 1
fi

echo "📋 Este script irá ajudá-lo a configurar o deploy do S.U.S.M.I"
echo ""
echo "Você precisará de:"
echo "  ✓ Credenciais do Supabase"
echo "  ✓ OpenAI API Key"
echo "  ✓ URLs dos serviços (após deploy no Railway/Vercel)"
echo ""

read -p "Continuar? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo "================================"
echo "1️⃣  CONFIGURAÇÃO DO SUPABASE"
echo "================================"
echo ""

read -p "URL do Supabase (https://xxx.supabase.co): " SUPABASE_URL
read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
read -p "Supabase Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
read -p "Database URL (com pooler): " DATABASE_URL
read -p "Direct URL (sem pooler): " DIRECT_URL

echo ""
echo "================================"
echo "2️⃣  CONFIGURAÇÃO DAS APIs DE IA"
echo "================================"
echo ""

read -p "OpenAI API Key (obrigatório): " OPENAI_API_KEY
read -p "Anthropic API Key (opcional, pressione Enter para pular): " ANTHROPIC_API_KEY

echo ""
echo "================================"
echo "3️⃣  CONFIGURAÇÃO DOS SERVIÇOS"
echo "================================"
echo ""

read -p "URL da API (Railway, ex: https://susmi-api.up.railway.app): " API_URL
read -p "URL do AI Service (Railway, ex: https://susmi-ai.up.railway.app): " AI_SERVICE_URL
read -p "URL do Frontend (Vercel, ex: https://susmi.vercel.app): " FRONTEND_URL

echo ""
echo "================================"
echo "4️⃣  GERANDO SECRETS"
echo "================================"
echo ""

JWT_SECRET=$(generate_jwt_secret)
echo -e "${GREEN}✓ JWT Secret gerado${NC}"

echo ""
echo "================================"
echo "📄 GERANDO ARQUIVOS .env"
echo "================================"
echo ""

# Criar .env.railway para API
cat > .env.railway.api << EOF
# ===========================================
# S.U.S.M.I API - Railway Environment
# Gerado automaticamente em $(date)
# ===========================================

# Database
DATABASE_URL="${DATABASE_URL}"
DIRECT_URL="${DIRECT_URL}"

# Supabase
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

# API Configuration
NODE_ENV=production
API_PORT=3001
CORS_ORIGIN=${FRONTEND_URL}

# AI Service
AI_SERVICE_URL=${AI_SERVICE_URL}

# JWT
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

# AI APIs
OPENAI_API_KEY=${OPENAI_API_KEY}
EOF

if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" >> .env.railway.api
fi

echo -e "${GREEN}✓ Criado: .env.railway.api${NC}"

# Criar .env.railway para AI Service
cat > .env.railway.ai << EOF
# ===========================================
# S.U.S.M.I AI Service - Railway Environment
# Gerado automaticamente em $(date)
# ===========================================

# Python
PYTHON_VERSION=3.11

# AI APIs
OPENAI_API_KEY=${OPENAI_API_KEY}
EOF

if [ ! -z "$ANTHROPIC_API_KEY" ]; then
    echo "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}" >> .env.railway.ai
fi

cat >> .env.railway.ai << EOF

# Configuration
PORT=8001
NODE_ENV=production
EOF

echo -e "${GREEN}✓ Criado: .env.railway.ai${NC}"

# Criar .env.vercel para Frontend
cat > .env.vercel.frontend << EOF
# ===========================================
# S.U.S.M.I Frontend - Vercel Environment
# Gerado automaticamente em $(date)
# ===========================================

# API
NEXT_PUBLIC_API_URL=${API_URL}

# Supabase
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EOF

echo -e "${GREEN}✓ Criado: .env.vercel.frontend${NC}"

echo ""
echo "================================"
echo "✅ CONFIGURAÇÃO COMPLETA!"
echo "================================"
echo ""
echo "Arquivos gerados:"
echo "  → .env.railway.api (copiar para Railway - susmi-api)"
echo "  → .env.railway.ai (copiar para Railway - susmi-ai)"
echo "  → .env.vercel.frontend (copiar para Vercel)"
echo ""
echo "Próximos passos:"
echo "  1. Copie as variáveis de .env.railway.api para o Railway (serviço susmi-api)"
echo "  2. Copie as variáveis de .env.railway.ai para o Railway (serviço susmi-ai)"
echo "  3. Copie as variáveis de .env.vercel.frontend para a Vercel"
echo "  4. Faça deploy dos serviços"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Mantenha estes arquivos seguros e não os commite!${NC}"
echo ""
echo "Para mais informações, consulte:"
echo "  → DEPLOY.md (guia completo)"
echo "  → DEPLOY_QUICKSTART.md (guia rápido)"
echo ""
echo -e "${GREEN}🎉 Boa sorte com seu deploy!${NC}"
