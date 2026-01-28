import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * User Preferences Service - Refatorado com SRP
 *
 * RESPONSABILIDADE: Gestão de preferências do usuário
 * Separado do UserManagementService
 */
@Injectable()
export class UserPreferencesService {
    constructor(private readonly prisma: PrismaService) {}

    async get(userId: string) {
        const preferences = await this.prisma.userPreference.findUnique({
            where: { userId },
        });

        if (!preferences) {
            throw new NotFoundException('User preferences not found');
        }

        return preferences;
    }

    async update(
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

    async updateTheme(userId: string, theme: 'light' | 'dark' | 'system') {
        return this.update(userId, { theme });
    }

    async updateLanguage(userId: string, language: string) {
        return this.update(userId, { language });
    }

    async toggleNotifications(userId: string) {
        const current = await this.get(userId);
        return this.update(userId, { notifications: !current.notifications });
    }

    async toggleVoice(userId: string) {
        const current = await this.get(userId);
        return this.update(userId, { voiceEnabled: !current.voiceEnabled });
    }

    async updateModelSettings(userId: string, settings: {
        preferredModel?: string;
        temperature?: number;
    }) {
        return this.update(userId, settings);
    }

    async reset(userId: string) {
        // Reset to default values
        return this.update(userId, {
            theme: 'system',
            language: 'pt-BR',
            notifications: true,
            voiceEnabled: false,
            preferredModel: 'gpt-4',
            temperature: 0.7,
        });
    }

    async export(userId: string) {
        const preferences = await this.get(userId);

        return {
            exportedAt: new Date().toISOString(),
            preferences,
        };
    }

    async import(userId: string, data: any) {
        const validKeys = [
            'theme',
            'language',
            'notifications',
            'voiceEnabled',
            'preferredModel',
            'temperature',
        ];

        const filteredData: any = {};
        for (const key of validKeys) {
            if (data[key] !== undefined) {
                filteredData[key] = data[key];
            }
        }

        return this.update(userId, filteredData);
    }
}
