import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Update Preferences Use Case
 *
 * APLICA SRP: Separado do CRUD de usuários.
 * Responsável apenas por gerenciar preferências.
 */
@Injectable()
export class UpdatePreferencesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
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
