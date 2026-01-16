import { Update, Ctx, Start, Command } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UsersService } from '../users/users.service';
import { Public } from '../common/decorators/public.decorator';

@Update()
@Public()
export class BotUpdate {
  constructor(private readonly usersService: UsersService) {}

  private isAdmin(ctx: Context): boolean {
    const adminId = parseInt(process.env.TELEGRAM_ADMIN_ID || '0');
    return ctx.from?.id === adminId;
  }

  // Helper para extrair argumentos do comando
  private getArgs(ctx: Context): string[] {
    // @ts-ignore - Tipagem do telegraf as vezes falha no message.text direto
    const text = ctx.message?.text || '';
    return text.split(' ').slice(1);
  }

  // Validação de email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Formatar data
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // Escapar caracteres especiais do MarkdownV2
  private escapeMarkdown(text: string): string {
    // Caracteres que precisam ser escapados no MarkdownV2: _ * [ ] ( ) ~ ` > # + - = | { } . !
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }

  // Mensagem de carregamento
  private async sendLoading(ctx: Context, message: string) {
    return await ctx.reply(`⏳ ${message}...`);
  }

  @Start()
  async start(@Ctx() ctx: Context): Promise<any> {
    const welcomeMessage = `
🤖 *Bem\\-vindo ao Painel Admin S\\.U\\.S\\.M\\.I\\.*

_Simplesmente Um Sistema Muito Inteligente_

📋 *Comandos Disponíveis:*

👥 *Gestão de Usuários*
• /listar \\- Listar todos os usuários
• /info \\[email\\] \\- Ver detalhes de um usuário
• /criar \\[email\\] \\[senha\\] \\[nome\\] \\[role\\] \\- Criar novo usuário
• /editar \\[email\\] \\[novo nome\\] \\- Editar nome do usuário
• /excluir \\[email\\] \\- Remover usuário

💡 *Exemplos de uso:*
\`/criar joao@email\\.com senha123 João Silva USER\`
\`/editar joao@email\\.com João Pedro\`
\`/info joao@email\\.com\`

⚠️ *Nota:* O role pode ser USER ou ADMIN
    `;

    await ctx.reply(welcomeMessage, { parse_mode: 'MarkdownV2' });
  }

  @Command('listar')
  async listUsers(@Ctx() ctx: Context): Promise<any> {
    if (!this.isAdmin(ctx)) {
      return ctx.reply('🚫 *Acesso Negado*\n\nApenas administradores podem executar este comando.', { parse_mode: 'Markdown' });
    }

    const loadingMsg = await this.sendLoading(ctx, 'Buscando usuários');

    try {
      const users = await this.usersService.findAll();

      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});

      if (users.length === 0) {
        return ctx.reply('📭 *Nenhum usuário encontrado*\n\nO sistema ainda não possui usuários cadastrados.', { parse_mode: 'Markdown' });
      }

      const adminCount = users.filter((u: any) => u.role === 'ADMIN').length;
      const userCount = users.filter((u: any) => u.role === 'USER').length;

      let message = `👥 *Lista de Usuários* ${this.escapeMarkdown(`(${users.length} total)`)}\n`;
      message += `📊 ${adminCount} Admin${adminCount !== 1 ? 's' : ''} • ${userCount} Usuário${userCount !== 1 ? 's' : ''}\n`;
      message += `${this.escapeMarkdown('─'.repeat(35))}\n\n`;

      users.forEach((u: any, index: number) => {
        const roleEmoji = u.role === 'ADMIN' ? '👑' : '👤';
        const createdDate = this.formatDate(u.createdAt);

        message += `${index + 1}\\. ${roleEmoji} *${this.escapeMarkdown(u.name)}*\n`;
        message += `   📧 \`${u.email}\`\n`;
        message += `   🔑 ${u.role}\n`;
        message += `   📅 ${this.escapeMarkdown(createdDate)}\n\n`;
      });

      message += `💡 Use /info \\[email\\] para ver mais detalhes`;

      return ctx.reply(message, { parse_mode: 'MarkdownV2' });
    } catch (error) {
      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
      console.error('Erro ao listar usuários:', error);
      return ctx.reply('❌ *Erro ao buscar usuários*\n\nOcorreu um problema ao acessar o banco de dados. Tente novamente.', { parse_mode: 'Markdown' });
    }
  }

  @Command('criar')
  async createUser(@Ctx() ctx: Context): Promise<any> {
    if (!this.isAdmin(ctx)) {
      return ctx.reply('🚫 *Acesso Negado*\n\nApenas administradores podem executar este comando.', { parse_mode: 'Markdown' });
    }

    const args = this.getArgs(ctx);

    if (args.length < 3) {
      const helpMessage = `⚠️ *Formato Incorreto*\n\n` +
        `*Uso correto:*\n` +
        `\`/criar [email] [senha] [nome] [role]\`\n\n` +
        `*Parâmetros:*\n` +
        `• email: Email válido\n` +
        `• senha: Mínimo 6 caracteres\n` +
        `• nome: Nome completo\n` +
        `• role: USER ou ADMIN (opcional, padrão: USER)\n\n` +
        `*Exemplo:*\n` +
        `\`/criar maria@email.com senha123 Maria Silva ADMIN\``;

      return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    }

    const email = args[0].toLowerCase();
    const password = args[1];
    let roleArg = 'USER';
    let nameArgs = args.slice(2);

    // Verifica se o último argumento é um role válido
    const lastArg = args[args.length - 1].toUpperCase();
    if (lastArg === 'USER' || lastArg === 'ADMIN') {
      roleArg = lastArg;
      nameArgs = args.slice(2, -1);
    }

    const name = nameArgs.join(' ');

    // Validações
    if (!this.isValidEmail(email)) {
      return ctx.reply('❌ *Email Inválido*\n\nPor favor, forneça um endereço de email válido.', { parse_mode: 'Markdown' });
    }

    if (password.length < 6) {
      return ctx.reply('❌ *Senha Fraca*\n\nA senha deve ter pelo menos 6 caracteres.', { parse_mode: 'Markdown' });
    }

    if (name.length < 2) {
      return ctx.reply('❌ *Nome Inválido*\n\nO nome deve ter pelo menos 2 caracteres.', { parse_mode: 'Markdown' });
    }

    const loadingMsg = await this.sendLoading(ctx, 'Criando usuário');

    try {
      const newUser = await this.usersService.create({
        email,
        password,
        name,
        role: roleArg as any,
      });

      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});

      const roleEmoji = roleArg === 'ADMIN' ? '👑' : '👤';
      const successMessage = `✅ *Usuário Criado com Sucesso\\!*\n\n` +
        `${roleEmoji} *Nome:* ${this.escapeMarkdown(name)}\n` +
        `📧 *Email:* \`${email}\`\n` +
        `🔑 *Permissão:* ${roleArg}\n` +
        `🆔 *ID:* \`${newUser.id}\`\n\n` +
        `🔐 Senha definida com sucesso\\.\n` +
        `💾 Dados salvos no banco de dados Supabase\\.`;

      return ctx.reply(successMessage, { parse_mode: 'MarkdownV2' });
    } catch (error: any) {
      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
      console.error('Erro ao criar usuário:', error);

      if (error.message?.includes('cadastrado') || error.code === 'P2002') {
        return ctx.reply('❌ *Email Já Cadastrado*\n\nJá existe um usuário com este endereço de email.', { parse_mode: 'Markdown' });
      }

      return ctx.reply('❌ *Erro ao Criar Usuário*\n\nOcorreu um erro ao salvar os dados. Verifique os parâmetros e tente novamente.', { parse_mode: 'Markdown' });
    }
  }

  @Command('editar')
  async editUser(@Ctx() ctx: Context): Promise<any> {
    if (!this.isAdmin(ctx)) {
      return ctx.reply('🚫 *Acesso Negado*\n\nApenas administradores podem executar este comando.', { parse_mode: 'Markdown' });
    }

    const args = this.getArgs(ctx);

    if (args.length < 2) {
      const helpMessage = `⚠️ *Formato Incorreto*\n\n` +
        `*Uso correto:*\n` +
        `\`/editar [email] [novo nome]\`\n\n` +
        `*Exemplo:*\n` +
        `\`/editar joao@email.com João Pedro Silva\``;

      return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    }

    const email = args[0].toLowerCase();
    const newName = args.slice(1).join(' ');

    if (newName.length < 2) {
      return ctx.reply('❌ *Nome Inválido*\n\nO nome deve ter pelo menos 2 caracteres.', { parse_mode: 'Markdown' });
    }

    if (!this.isValidEmail(email)) {
      return ctx.reply('❌ *Email Inválido*\n\nPor favor, forneça um endereço de email válido.', { parse_mode: 'Markdown' });
    }

    const loadingMsg = await this.sendLoading(ctx, 'Buscando usuário');

    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
        return ctx.reply('❌ *Usuário Não Encontrado*\n\nNão existe usuário cadastrado com este email.', { parse_mode: 'Markdown' });
      }

      const oldName = user.name;
      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});

      const updatingMsg = await this.sendLoading(ctx, 'Atualizando dados');
      await this.usersService.update(user.id, { name: newName });
      await ctx.deleteMessage(updatingMsg.message_id).catch(() => {});

      const roleEmoji = user.role === 'ADMIN' ? '👑' : '👤';
      const successMessage = `✅ *Usuário Atualizado com Sucesso\\!*\n\n` +
        `${roleEmoji} *Nome Anterior:* ${this.escapeMarkdown(oldName)}\n` +
        `${roleEmoji} *Nome Novo:* ${this.escapeMarkdown(newName)}\n` +
        `📧 *Email:* \`${email}\`\n\n` +
        `💾 Alterações salvas no banco de dados Supabase\\.`;

      return ctx.reply(successMessage, { parse_mode: 'MarkdownV2' });
    } catch (error) {
      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
      console.error('Erro ao editar usuário:', error);
      return ctx.reply('❌ *Erro ao Atualizar*\n\nOcorreu um erro ao salvar as alterações. Tente novamente.', { parse_mode: 'Markdown' });
    }
  }

  @Command('excluir')
  async deleteUser(@Ctx() ctx: Context): Promise<any> {
    if (!this.isAdmin(ctx)) {
      return ctx.reply('🚫 *Acesso Negado*\n\nApenas administradores podem executar este comando.', { parse_mode: 'Markdown' });
    }

    const args = this.getArgs(ctx);

    if (args.length < 1) {
      const helpMessage = `⚠️ *Formato Incorreto*\n\n` +
        `*Uso correto:*\n` +
        `\`/excluir [email]\`\n\n` +
        `*Exemplo:*\n` +
        `\`/excluir joao@email.com\`\n\n` +
        `⚠️ *Atenção:* Esta ação é irreversível!`;

      return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    }

    const email = args[0].toLowerCase();

    if (!this.isValidEmail(email)) {
      return ctx.reply('❌ *Email Inválido*\n\nPor favor, forneça um endereço de email válido.', { parse_mode: 'Markdown' });
    }

    const loadingMsg = await this.sendLoading(ctx, 'Buscando usuário');

    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
        return ctx.reply('❌ *Usuário Não Encontrado*\n\nNão existe usuário cadastrado com este email.', { parse_mode: 'Markdown' });
      }

      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});

      // Mostra informações do usuário antes de confirmar exclusão
      const roleEmoji = user.role === 'ADMIN' ? '👑' : '👤';
      const confirmMessage = `⚠️ *Confirmar Exclusão*\n\n` +
        `Tem certeza que deseja excluir este usuário?\n\n` +
        `${roleEmoji} *Nome:* ${user.name}\n` +
        `📧 *Email:* \`${email}\`\n` +
        `🔑 *Permissão:* ${user.role}\n\n` +
        `🗑️ Esta ação é *IRREVERSÍVEL*!\n\n` +
        `Para confirmar, envie:\n` +
        `\`/confirmar_exclusao ${email}\``;

      return ctx.reply(confirmMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
      console.error('Erro ao buscar usuário:', error);
      return ctx.reply('❌ *Erro ao Buscar Usuário*\n\nOcorreu um erro ao acessar o banco de dados.', { parse_mode: 'Markdown' });
    }
  }

  @Command('confirmar_exclusao')
  async confirmDelete(@Ctx() ctx: Context): Promise<any> {
    if (!this.isAdmin(ctx)) {
      return ctx.reply('🚫 *Acesso Negado*\n\nApenas administradores podem executar este comando.', { parse_mode: 'Markdown' });
    }

    const args = this.getArgs(ctx);

    if (args.length < 1) {
      return ctx.reply('⚠️ *Confirmação Inválida*\n\nUse o comando /excluir primeiro.', { parse_mode: 'Markdown' });
    }

    const email = args[0].toLowerCase();
    const loadingMsg = await this.sendLoading(ctx, 'Excluindo usuário');

    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
        return ctx.reply('❌ *Usuário Não Encontrado*\n\nO usuário pode já ter sido excluído.', { parse_mode: 'Markdown' });
      }

      const userName = user.name;
      const userRole = user.role;

      await this.usersService.removeByEmail(email);
      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});

      const roleEmoji = userRole === 'ADMIN' ? '👑' : '👤';
      const successMessage = `✅ *Usuário Excluído com Sucesso\\!*\n\n` +
        `${roleEmoji} *Nome:* ${this.escapeMarkdown(userName)}\n` +
        `📧 *Email:* \`${email}\`\n` +
        `🔑 *Permissão:* ${userRole}\n\n` +
        `🗑️ Todos os dados foram removidos do banco de dados Supabase\\.`;

      return ctx.reply(successMessage, { parse_mode: 'MarkdownV2' });
    } catch (error) {
      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
      console.error('Erro ao excluir usuário:', error);
      return ctx.reply('❌ *Erro ao Excluir*\n\nOcorreu um erro ao remover o usuário do banco de dados.', { parse_mode: 'Markdown' });
    }
  }

  @Command('info')
  async userInfo(@Ctx() ctx: Context): Promise<any> {
    if (!this.isAdmin(ctx)) {
      return ctx.reply('🚫 *Acesso Negado*\n\nApenas administradores podem executar este comando.', { parse_mode: 'Markdown' });
    }

    const args = this.getArgs(ctx);

    if (args.length < 1) {
      const helpMessage = `⚠️ *Formato Incorreto*\n\n` +
        `*Uso correto:*\n` +
        `\`/info [email]\`\n\n` +
        `*Exemplo:*\n` +
        `\`/info joao@email.com\``;

      return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    }

    const email = args[0].toLowerCase();

    if (!this.isValidEmail(email)) {
      return ctx.reply('❌ *Email Inválido*\n\nPor favor, forneça um endereço de email válido.', { parse_mode: 'Markdown' });
    }

    const loadingMsg = await this.sendLoading(ctx, 'Buscando informações');

    try {
      const user = await this.usersService.findByEmail(email);

      if (!user) {
        await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
        return ctx.reply('❌ *Usuário Não Encontrado*\n\nNão existe usuário cadastrado com este email.', { parse_mode: 'Markdown' });
      }

      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});

      const roleEmoji = user.role === 'ADMIN' ? '👑' : '👤';
      const createdDate = this.formatDate(user.createdAt);
      const updatedDate = this.formatDate(user.updatedAt);

      const response = `
${roleEmoji} *Informações Completas do Usuário*
${this.escapeMarkdown('═'.repeat(35))}

📝 *Dados Pessoais*
• Nome: ${this.escapeMarkdown(user.name)}
• Email: \`${user.email}\`
• Avatar: ${user.avatar ? '✅ Configurado' : '❌ Não configurado'}

🔐 *Permissões e Acesso*
• Tipo: ${user.role}
• Nível: ${this.escapeMarkdown(user.role === 'ADMIN' ? 'Administrador' : 'Usuário Padrão')}

🌍 *Configurações Regionais*
• Fuso Horário: ${this.escapeMarkdown(user.timezone)}

🆔 *Identificação*
• ID: \`${user.id}\`

📅 *Datas*
• Criado em: ${this.escapeMarkdown(createdDate)}
• Atualizado em: ${this.escapeMarkdown(updatedDate)}

💾 *Fonte de Dados*
Banco de dados Supabase \\(PostgreSQL\\)
      `;

      return ctx.reply(response, { parse_mode: 'MarkdownV2' });
    } catch (error) {
      await ctx.deleteMessage(loadingMsg.message_id).catch(() => {});
      console.error('Erro ao buscar informações:', error);
      return ctx.reply('❌ *Erro ao Buscar Dados*\n\nOcorreu um erro ao acessar o banco de dados.', { parse_mode: 'Markdown' });
    }
  }
}