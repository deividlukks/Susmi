#!/usr/bin/env node

/**
 * Script para Criar Usuário Admin - SUSMI
 * Uso: node scripts/create-admin.js [email] [senha] [nome]
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${prompt}${colors.reset}`, resolve);
  });
}

async function createAdmin() {
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('  👤 Criar Usuário Administrador - SUSMI', 'cyan');
  log('═══════════════════════════════════════════════════════', 'cyan');
  log('');

  // Obter dados do admin
  const email =
    process.argv[2] || (await question('Email do admin: '));
  const password =
    process.argv[3] || (await question('Senha (mín. 6 caracteres): '));
  const name = process.argv[4] || (await question('Nome completo: '));

  if (!email || !password || !name) {
    log('\n✗ Todos os campos são obrigatórios!', 'red');
    rl.close();
    process.exit(1);
  }

  if (password.length < 6) {
    log('\n✗ A senha deve ter no mínimo 6 caracteres!', 'red');
    rl.close();
    process.exit(1);
  }

  log('\n📝 Criando usuário...', 'yellow');

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
        role: 'ADMIN',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao criar usuário');
    }

    const data = await response.json();

    log('\n✅ Usuário administrador criado com sucesso!', 'green');
    log('', '');
    log('═══════════════════════════════════════════════════════', 'cyan');
    log('  Dados do Usuário:', 'cyan');
    log('═══════════════════════════════════════════════════════', 'cyan');
    log(`  ID:    ${data.user.id}`, 'blue');
    log(`  Nome:  ${data.user.name}`, 'blue');
    log(`  Email: ${data.user.email}`, 'blue');
    log(`  Role:  ${data.user.role}`, 'blue');
    log('');
    log('💡 Você pode fazer login em: http://localhost:3000', 'cyan');
    log('');

    rl.close();
  } catch (error) {
    log(`\n✗ Erro ao criar usuário: ${error.message}`, 'red');

    if (error.message.includes('fetch')) {
      log('', '');
      log('⚠️  A API não está rodando!', 'yellow');
      log('   Execute "pnpm dev" primeiro', 'cyan');
    }

    rl.close();
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createAdmin();
}

module.exports = { createAdmin };
