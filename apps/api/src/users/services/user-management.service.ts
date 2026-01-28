import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../domain/services/password.service';

/**
 * User Management Service - Refatorado com SRP
 *
 * RESPONSABILIDADE: CRUD de usuários
 * Password management foi movido para PasswordService
 */
@Injectable()
export class UserManagementService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly passwordService: PasswordService,
    ) {}

    async create(data: { email: string; password?: string; name?: string }) {
        const passwordHash = data.password
            ? await this.passwordService.hash(data.password)
            : null;

        return this.prisma.user.create({
            data: {
                email: data.email,
                name: data.name,
                passwordHash,
                preferences: {
                    create: {},
                },
            },
            include: {
                preferences: true,
            },
        });
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                preferences: true,
            },
        });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: {
                preferences: true,
            },
        });
    }

    async findOrCreate(data: { id: string; email: string; name?: string }) {
        const existing = await this.prisma.user.findUnique({
            where: { id: data.id },
        });

        if (existing) {
            return existing;
        }

        return this.prisma.user.create({
            data: {
                id: data.id,
                email: data.email,
                name: data.name,
                preferences: {
                    create: {},
                },
            },
            include: {
                preferences: true,
            },
        });
    }

    async update(id: string, data: Partial<{ name: string; avatarUrl: string }>) {
        return this.prisma.user.update({
            where: { id },
            data,
            include: {
                preferences: true,
            },
        });
    }

    async updatePassword(id: string, newPassword: string): Promise<void> {
        const passwordHash = await this.passwordService.hash(newPassword);
        await this.prisma.user.update({
            where: { id },
            data: { passwordHash },
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.user.delete({
            where: { id },
        });
    }

    async list(filters?: { search?: string; limit?: number; offset?: number }) {
        const { search, limit = 50, offset = 0 } = filters || {};

        const where = search
            ? {
                  OR: [
                      { email: { contains: search } },
                      { name: { contains: search } },
                  ],
              }
            : {};

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    avatarUrl: true,
                    createdAt: true,
                },
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            users,
            total,
            limit,
            offset,
        };
    }
}
