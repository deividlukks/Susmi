import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';

/**
 * Update User Use Case
 *
 * APLICA SRP: Responsável apenas por atualizar dados do usuário.
 */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(
    userId: string,
    data: Partial<{ name: string; avatarUrl: string }>,
  ): Promise<UserEntity> {
    // Busca usuário
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Aplica mudanças usando métodos do domínio
    if (data.name !== undefined) {
      user.updateName(data.name);
    }

    if (data.avatarUrl !== undefined) {
      user.updateAvatar(data.avatarUrl);
    }

    // Persiste
    return this.userRepository.update(user);
  }
}
