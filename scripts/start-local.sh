#!/bin/bash

# Script de Inicialização Local - SUSMI
# Bash

echo "🚀 Iniciando SUSMI Localmente..."
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Verificar Node.js
echo -e "${YELLOW}✓ Verificando Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "  ${GREEN}Node.js: $NODE_VERSION${NC}"
else
    echo -e "  ${RED}✗ Node.js não encontrado!${NC}"
    exit 1
fi

# Verificar PNPM
echo -e "${YELLOW}✓ Verificando PNPM...${NC}"
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "  ${GREEN}PNPM: $PNPM_VERSION${NC}"
else
    echo -e "  ${RED}✗ PNPM não encontrado! Instale com: npm install -g pnpm${NC}"
    exit 1
fi

# Verificar Redis
echo -e "${YELLOW}✓ Verificando Redis...${NC}"
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo -e "  ${GREEN}Redis: OK${NC}"
    else
        echo -e "  ${YELLOW}⚠ Redis não está respondendo${NC}"
        echo -e "    ${CYAN}Inicie com: docker run -d -p 6379:6379 redis:alpine${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠ Redis não encontrado${NC}"
    echo -e "    ${CYAN}Instale Docker e execute: docker run -d -p 6379:6379 redis:alpine${NC}"
fi

# Testar conexão com Supabase
echo ""
echo -e "${YELLOW}✓ Testando conexão com Supabase...${NC}"
cd apps/api
if npx prisma db pull --force &> /dev/null; then
    echo -e "  ${GREEN}Supabase: Conectado ✓${NC}"
else
    echo -e "  ${RED}✗ Erro ao conectar com Supabase!${NC}"
    echo -e "  ${CYAN}Verifique as credenciais em apps/api/.env${NC}"
    cd ../..
    exit 1
fi
cd ../..

# Verificar se migrations foram aplicadas
echo ""
echo -e "${YELLOW}✓ Verificando migrations...${NC}"
cd apps/api
MIGRATE_STATUS=$(npx prisma migrate status 2>&1)
if echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
    echo -e "  ${GREEN}Migrations: OK${NC}"
else
    echo -e "  ${YELLOW}⚠ Migrations pendentes${NC}"
    echo -e "  ${CYAN}Deseja aplicar as migrations? (S/N)${NC}"
    read -r response
    if [[ "$response" =~ ^[Ss]$ ]]; then
        echo -e "  ${YELLOW}Aplicando migrations...${NC}"
        npx prisma migrate deploy
        npx prisma generate
        echo -e "  ${GREEN}Migrations aplicadas ✓${NC}"
    fi
fi
cd ../..

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${GREEN}✅ Pré-requisitos verificados!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Iniciando servidores...${NC}"
echo ""
echo -e "  🔷 API (NestJS):   ${CYAN}http://localhost:4000${NC}"
echo -e "  🌐 Web (Next.js):  ${CYAN}http://localhost:3000${NC}"
echo -e "  📚 API Docs:       ${CYAN}http://localhost:4000/docs${NC}"
echo ""
echo "Pressione Ctrl+C para parar os servidores"
echo ""

# Iniciar em modo dev
pnpm dev
