import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';

// Repository
import { UserRepository } from './infrastructure/repositories/user.repository';

// Domain Services
import { PasswordService } from './domain/services/password.service';

// Application Services (SRP compliant)
import { UserManagementService } from './services/user-management.service';
import { UserPreferencesService } from './services/user-preferences.service';

// Use Cases
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { UpdatePasswordUseCase } from './application/use-cases/update-password.use-case';
import { ValidatePasswordUseCase } from './application/use-cases/validate-password.use-case';
import { UpdatePreferencesUseCase } from './application/use-cases/update-preferences.use-case';

// Legacy service (para compatibilidade com AuthService)
import { UsersService } from './users.service';

/**
 * Users Module - Refatorado com DDD e SRP
 *
 * APLICA SRP: Responsabilidades separadas em use cases distintos:
 * - CreateUserUseCase: Criar usuários
 * - UpdateUserUseCase: Atualizar perfil
 * - UpdatePasswordUseCase: Gerenciar senha
 * - ValidatePasswordUseCase: Validar login
 * - UpdatePreferencesUseCase: Gerenciar preferências
 */
@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    // Repository
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    // Domain Services
    PasswordService,
    // Application Services (SRP compliant)
    UserManagementService,
    UserPreferencesService,
    // Use Cases
    CreateUserUseCase,
    UpdateUserUseCase,
    UpdatePasswordUseCase,
    ValidatePasswordUseCase,
    UpdatePreferencesUseCase,
    // Legacy (manter para compatibilidade temporária com Auth)
    UsersService,
  ],
  exports: [
    // Domain Services
    PasswordService,
    // Application Services
    UserManagementService,
    UserPreferencesService,
    // Use Cases
    CreateUserUseCase,
    ValidatePasswordUseCase,
    UpdatePasswordUseCase,
    // Legacy
    UsersService,
  ],
})
export class UsersModule {}
