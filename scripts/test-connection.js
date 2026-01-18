#!/usr/bin/env node

/**
 * Script de Teste de Conexão - SUSMI
 * Testa conexões com Supabase e API
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

async function testSupabase() {
  log('\n✓ Testando Supabase (PostgreSQL)...', 'yellow');
  try {
    process.chdir('packages/database');
    const { stdout, stderr } = await execPromise('npx dotenv -e ../../.env -- prisma db pull --force');
    process.chdir('../..');

    if (stderr && stderr.includes('Error')) {
      log('  ✗ Supabase: Erro na conexão', 'red');
      log(`    ${stderr}`, 'red');
      return false;
    }

    log('  ✓ Supabase: Conectado', 'green');
    return true;
  } catch (error) {
    try { process.chdir('../..'); } catch { }
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
    supabase: await testSupabase(),
    api: await testAPI(),
    web: await testWeb(),
  };

  log('\n═══════════════════════════════════════════════════════', 'cyan');
  log('  📊 Resumo', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  log(`  Supabase: ${results.supabase ? '✓' : '✗'}`, results.supabase ? 'green' : 'red');
  log(`  API:      ${results.api ? '✓' : '✗'}`, results.api ? 'green' : 'yellow');
  log(`  Web:      ${results.web ? '✓' : '✗'}`, results.web ? 'green' : 'yellow');

  if (results.supabase) {
    log('\n✅ Conexão com banco de dados OK!', 'green');
    if (!results.api || !results.web) {
      log('💡 Execute "pnpm dev" para iniciar API e Web', 'cyan');
    }
  } else {
    log('\n⚠️  Verifique a conexão com o banco de dados', 'yellow');
  }

  log('');
}

main().catch((error) => {
  console.error('Erro ao executar testes:', error);
  process.exit(1);
});
