#!/usr/bin/env node

/**
 * Script de Teste de Conexão - SUSMI
 * Testa conexões com Supabase, Redis e API
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testRedis() {
  log('\n✓ Testando Redis...', 'yellow');
  try {
    const { stdout } = await execPromise('redis-cli ping');
    if (stdout.trim() === 'PONG') {
      log('  ✓ Redis: Conectado', 'green');
      return true;
    }
  } catch (error) {
    log('  ✗ Redis: Não conectado', 'red');
    log('    Inicie com: docker run -d -p 6379:6379 redis:alpine', 'cyan');
    return false;
  }
}

async function testSupabase() {
  log('\n✓ Testando Supabase (PostgreSQL)...', 'yellow');
  try {
    process.chdir('apps/api');
    const { stdout, stderr } = await execPromise('npx prisma db pull --force');
    process.chdir('../..');

    if (stderr && stderr.includes('Error')) {
      log('  ✗ Supabase: Erro na conexão', 'red');
      log(`    ${stderr}`, 'red');
      return false;
    }

    log('  ✓ Supabase: Conectado', 'green');

    // Testar query
    const { PrismaClient } = require('../apps/api/node_modules/@prisma/client');
    const prisma = new PrismaClient();

    try {
      const userCount = await prisma.user.count();
      log(`    → ${userCount} usuário(s) no banco`, 'cyan');
      await prisma.$disconnect();
    } catch (error) {
      log('    ⚠ Tabelas ainda não criadas', 'yellow');
    }

    return true;
  } catch (error) {
    process.chdir('../..');
    log('  ✗ Supabase: Erro na conexão', 'red');
    log(`    ${error.message}`, 'red');
    return false;
  }
}

async function testAPI() {
  log('\n✓ Testando API...', 'yellow');
  try {
    const response = await fetch('http://localhost:4000/api');
    if (response.ok) {
      log('  ✓ API: Rodando na porta 4000', 'green');
      return true;
    } else {
      log('  ⚠ API: Não está respondendo', 'yellow');
      return false;
    }
  } catch (error) {
    log('  ⚠ API: Não está rodando', 'yellow');
    log('    Inicie com: pnpm dev', 'cyan');
    return false;
  }
}

async function testWeb() {
  log('\n✓ Testando Frontend (Web)...', 'yellow');
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok) {
      log('  ✓ Web: Rodando na porta 3000', 'green');
      return true;
    } else {
      log('  ⚠ Web: Não está respondendo', 'yellow');
      return false;
    }
  } catch (error) {
    log('  ⚠ Web: Não está rodando', 'yellow');
    log('    Inicie com: pnpm dev', 'cyan');
    return false;
  }
}

async function main() {
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('  🧪 Teste de Conexão - SUSMI', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');

  const results = {
    redis: await testRedis(),
    supabase: await testSupabase(),
    api: await testAPI(),
    web: await testWeb(),
  };

  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  📊 Resumo', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  log(`  Redis:    ${results.redis ? '✓' : '✗'}`, results.redis ? 'green' : 'red');
  log(`  Supabase: ${results.supabase ? '✓' : '✗'}`, results.supabase ? 'green' : 'red');
  log(`  API:      ${results.api ? '✓' : '✗'}`, results.api ? 'green' : 'yellow');
  log(`  Web:      ${results.web ? '✓' : '✗'}`, results.web ? 'green' : 'yellow');

  const allPassed = results.redis && results.supabase;

  if (allPassed) {
    log('\n✅ Todos os serviços essenciais estão funcionando!', 'green');
    if (!results.api || !results.web) {
      log('💡 Execute "pnpm dev" para iniciar API e Web', 'cyan');
    }
  } else {
    log('\n⚠️  Alguns serviços precisam de atenção', 'yellow');
  }

  log('');
}

main().catch((error) => {
  console.error('Erro ao executar testes:', error);
  process.exit(1);
});
