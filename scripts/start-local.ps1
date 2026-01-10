# Script de Inicialização Local - SUSMI
# PowerShell

Write-Host "🚀 Iniciando SUSMI Localmente..." -ForegroundColor Green
Write-Host ""

# Verificar Node.js
Write-Host "✓ Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ Node.js não encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar PNPM
Write-Host "✓ Verificando PNPM..." -ForegroundColor Yellow
$pnpmVersion = pnpm --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "  PNPM: $pnpmVersion" -ForegroundColor Green
} else {
    Write-Host "  ✗ PNPM não encontrado! Instale com: npm install -g pnpm" -ForegroundColor Red
    exit 1
}

# Verificar Redis
Write-Host "✓ Verificando Redis..." -ForegroundColor Yellow
try {
    $redisTest = redis-cli ping 2>&1
    if ($redisTest -match "PONG") {
        Write-Host "  Redis: OK" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Redis não está respondendo" -ForegroundColor Yellow
        Write-Host "    Inicie com: docker run -d -p 6379:6379 redis:alpine" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ⚠ Redis não encontrado" -ForegroundColor Yellow
    Write-Host "    Instale Docker e execute: docker run -d -p 6379:6379 redis:alpine" -ForegroundColor Cyan
}

# Testar conexão com Supabase
Write-Host ""
Write-Host "✓ Testando conexão com Supabase..." -ForegroundColor Yellow
Set-Location apps/api
$prismaTest = npx prisma db pull --force 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Supabase: Conectado ✓" -ForegroundColor Green
} else {
    Write-Host "  ✗ Erro ao conectar com Supabase!" -ForegroundColor Red
    Write-Host "  Verifique as credenciais em apps/api/.env" -ForegroundColor Cyan
    Set-Location ../..
    exit 1
}
Set-Location ../..

# Verificar se migrations foram aplicadas
Write-Host ""
Write-Host "✓ Verificando migrations..." -ForegroundColor Yellow
Set-Location apps/api
$migrateStatus = npx prisma migrate status 2>&1
if ($migrateStatus -match "Database schema is up to date") {
    Write-Host "  Migrations: OK" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Migrations pendentes" -ForegroundColor Yellow
    Write-Host "  Deseja aplicar as migrations? (S/N)" -ForegroundColor Cyan
    $response = Read-Host
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host "  Aplicando migrations..." -ForegroundColor Yellow
        npx prisma migrate deploy
        npx prisma generate
        Write-Host "  Migrations aplicadas ✓" -ForegroundColor Green
    }
}
Set-Location ../..

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  ✅ Pré-requisitos verificados!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Iniciando servidores..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  🔷 API (NestJS):   http://localhost:4000" -ForegroundColor Blue
Write-Host "  🌐 Web (Next.js):  http://localhost:3000" -ForegroundColor Blue
Write-Host "  📚 API Docs:       http://localhost:4000/docs" -ForegroundColor Blue
Write-Host ""
Write-Host "Pressione Ctrl+C para parar os servidores" -ForegroundColor Gray
Write-Host ""

# Iniciar em modo dev
pnpm dev
