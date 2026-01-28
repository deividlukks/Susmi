import { Injectable, Inject } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PasswordUtil } from '../../../common/utils/password.util';

/**
 * Validate Password Use Case
 *
 * APLICA SRP: Responsável apenas por validar senha.
 * Usado pelo AuthService durante login.
 */
@Injectable()
export class ValidatePasswordUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(email: string, password: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.hasPassword()) {
      return false;
    }

    return PasswordUtil.compare(password, user.getPasswordHash()!);
  }
}
