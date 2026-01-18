# Script de Inicialização Local - SUSMI
# PowerShell

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  🚀 SUSMI - Inicialização Local" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar Node.js
Write-Host "✓ Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
}
else {
    Write-Host "  ✗ Node.js não encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar PNPM
Write-Host "✓ Verificando PNPM..." -ForegroundColor Yellow
$pnpmVersion = pnpm --version
if ($LASTEXITCODE -eq 0) {
    Write-Host "  PNPM: $pnpmVersion" -ForegroundColor Green
}
else {
    Write-Host "  ✗ PNPM não encontrado! Instale com: npm install -g pnpm" -ForegroundColor Red
    exit 1
}

# Testar conexão com Supabase
Write-Host ""
Write-Host "✓ Testando conexão com Supabase..." -ForegroundColor Yellow
Set-Location packages/database
$null = pnpm db:generate 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Supabase: Conectado ✓" -ForegroundColor Green
}
else {
    Write-Host "  ✗ Erro ao conectar com Supabase!" -ForegroundColor Red
    Write-Host "  Verifique as credenciais em .env" -ForegroundColor Cyan
    Set-Location ../..
    exit 1
}
Set-Location ../..

# Verificar se migrations foram aplicadas
Write-Host ""
Write-Host "✓ Verificando migrations..." -ForegroundColor Yellow
Set-Location packages/database
$migrateStatus = npx dotenv -e ../../.env -- prisma migrate status 2>&1
if ($migrateStatus -match "Database schema is up to date") {
    Write-Host "  Migrations: OK" -ForegroundColor Green
}
else {
    Write-Host "  ⚠ Migrations pendentes" -ForegroundColor Yellow
    Write-Host "  Deseja aplicar as migrations? (S/N)" -ForegroundColor Cyan
    $response = Read-Host
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host "  Aplicando migrations..." -ForegroundColor Yellow
        pnpm db:migrate:deploy
        Write-Host "  Migrations aplicadas ✓" -ForegroundColor Green
    }
}
Set-Location ../..

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  ✅ Pré-requisitos verificados!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Perguntar se deseja criar admin
Write-Host "Deseja criar um usuário administrador? (S/N)" -ForegroundColor Cyan
$createAdmin = Read-Host
if ($createAdmin -eq "S" -or $createAdmin -eq "s") {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  👤 Criar Usuário Administrador" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    $email = Read-Host "  Email"
    $password = Read-Host "  Senha (mín. 6 caracteres)"
    $name = Read-Host "  Nome completo"
    
    if ($email -and $password -and $name) {
        Write-Host ""
        Write-Host "📝 Criando usuário..." -ForegroundColor Yellow
        Write-Host "⚠️  Certifique-se de que a API está rodando em outra janela" -ForegroundColor Yellow
        Write-Host "   Pressione Enter quando a API estiver pronta, ou Ctrl+C para pular" -ForegroundColor Gray
        Read-Host
        
        $body = @{
            email    = $email
            password = $password
            name     = $name
            role     = "ADMIN"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
            Write-Host "✅ Usuário administrador criado com sucesso!" -ForegroundColor Green
            Write-Host "   ID: $($response.user.id)" -ForegroundColor Blue
            Write-Host "   Email: $($response.user.email)" -ForegroundColor Blue
        }
        catch {
            Write-Host "✗ Erro ao criar usuário: $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "⚠️  Dados incompletos, pulando criação de admin" -ForegroundColor Yellow
    }
}

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
