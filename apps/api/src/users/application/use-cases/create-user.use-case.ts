import { Injectable, Inject, ConflictException, BadRequestException } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { PasswordUtil } from '../../../common/utils/password.util';
import { randomUUID } from 'crypto';

/**
 * Create User Use Case
 *
 * APLICA SRP: Responsável apenas por criar usuários.
 * DEMONSTRA DRY: Usa PasswordUtil compartilhado.
 */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(data: {
    email: string;
    password?: string;
    name?: string;
  }): Promise<UserEntity> {
    // Valida email
    if (!UserEntity.validateEmail(data.email)) {
      throw new BadRequestException('Email inválido');
    }

    // Verifica se email já existe
    if (await this.userRepository.emailExists(data.email)) {
      throw new ConflictException('Email já cadastrado');
    }

    // Hash de senha (se fornecida) usando PasswordUtil
    let passwordHash: string | null = null;
    if (data.password) {
      passwordHash = await PasswordUtil.hash(data.password);
    }

    // Cria entidade de domínio
    const user = new UserEntity(
      randomUUID(),
      data.email,
      data.name || null,
      null, // avatarUrl
      passwordHash,
      'USER', // role padrão
      new Date(),
      new Date(),
    );

    // Persiste
    return this.userRepository.create(user);
  }
}
