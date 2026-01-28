import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';

/**
 * User Repository - Implementação Prisma
 *
 * APLICA DIP: Implementa interface definida no domínio.
 */
@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.toDomain(user) : null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.getEmail(),
        name: user.getName(),
        avatarUrl: user.getAvatarUrl(),
        passwordHash: user.getPasswordHash(),
        role: user.role,
        preferences: {
          create: {}, // Cria preferências padrão
        },
      },
    });

    return this.toDomain(created);
  }

  async update(user: UserEntity): Promise<UserEntity> {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.getName(),
        avatarUrl: user.getAvatarUrl(),
        passwordHash: user.getPasswordHash(),
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });
    return count > 0;
  }

  async findOrCreate(data: {
    id: string;
    email: string;
    name?: string;
  }): Promise<UserEntity> {
    const existing = await this.prisma.user.findUnique({
      where: { id: data.id },
    });

    if (existing) {
      return this.toDomain(existing);
    }

    const created = await this.prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        name: data.name || null,
        preferences: {
          create: {},
        },
      },
    });

    return this.toDomain(created);
  }

  /**
   * Converte modelo Prisma para entidade de domínio
   */
  private toDomain(prismaUser: any): UserEntity {
    return new UserEntity(
      prismaUser.id,
      prismaUser.email,
      prismaUser.name,
      prismaUser.avatarUrl,
      prismaUser.passwordHash,
      prismaUser.role,
      prismaUser.createdAt,
      prismaUser.updatedAt,
    );
  }
}
