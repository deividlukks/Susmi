import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PasswordUtil } from '../../../common/utils/password.util';

/**
 * Update Password Use Case
 *
 * APLICA SRP: Responsável apenas por atualizar senha.
 * DEMONSTRA DRY: Usa PasswordUtil compartilhado.
 */
@Injectable()
export class UpdatePasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Busca usuário
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Valida senha atual
    if (!user.hasPassword()) {
      throw new BadRequestException('Usuário não possui senha configurada');
    }

    const isValid = await PasswordUtil.compare(
      currentPassword,
      user.getPasswordHash()!,
    );

    if (!isValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Valida força da nova senha
    if (!PasswordUtil.validateStrength(newPassword)) {
      throw new BadRequestException(
        'Senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas e números',
      );
    }

    // Hash nova senha
    const newHash = await PasswordUtil.hash(newPassword);
    user.setPasswordHash(newHash);

    // Persiste
    await this.userRepository.update(user);
  }
}
