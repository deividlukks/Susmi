import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: { email: string; password?: string; name?: string }) {
        const passwordHash = data.password
            ? await bcrypt.hash(data.password, 10)
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

    async validatePassword(user: { passwordHash: string | null }, password: string): Promise<boolean> {
        if (!user.passwordHash) {
            return false;
        }
        return bcrypt.compare(password, user.passwordHash);
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
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id },
            data: { passwordHash },
        });
    }

    async updatePreferences(
        userId: string,
        data: Partial<{
            theme: string;
            language: string;
            notifications: boolean;
            voiceEnabled: boolean;
            preferredModel: string;
            temperature: number;
        }>,
    ) {
        return this.prisma.userPreference.update({
            where: { userId },
            data,
        });
    }
}
