import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface IntegrationProvider {
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope: string[];
  metadata?: any;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Save or update an integration
   */
  async saveIntegration(userId: string, data: IntegrationProvider) {
    const existing = await this.prisma.integrations.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: data.provider,
        },
      },
    });

    if (existing) {
      return this.prisma.integrations.update({
        where: { id: existing.id },
        data: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          scope: data.scope,
          metadata: data.metadata,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.integrations.create({
      data: {
        userId,
        provider: data.provider,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        scope: data.scope,
        metadata: data.metadata,
      },
    });
  }

  /**
   * Get an integration by provider
   */
  async getIntegration(userId: string, provider: string) {
    const integration = await this.prisma.integrations.findUnique({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${provider} not found for user`);
    }

    return integration;
  }

  /**
   * Get all integrations for a user
   */
  async getAllIntegrations(userId: string) {
    return this.prisma.integrations.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        scope: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        // Exclude sensitive tokens
        accessToken: false,
        refreshToken: false,
      },
    });
  }

  /**
   * Deactivate an integration
   */
  async deactivateIntegration(userId: string, provider: string) {
    const integration = await this.getIntegration(userId, provider);

    return this.prisma.integrations.update({
      where: { id: integration.id },
      data: { isActive: false },
    });
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(userId: string, provider: string) {
    const integration = await this.getIntegration(userId, provider);

    await this.prisma.integrations.delete({
      where: { id: integration.id },
    });

    this.logger.log(`Deleted ${provider} integration for user ${userId}`);
    return { success: true };
  }

  /**
   * Check if token is expired and needs refresh
   */
  isTokenExpired(integration: any): boolean {
    if (!integration.expiresAt) return false;
    return new Date(integration.expiresAt) <= new Date();
  }

  /**
   * Refresh access token for a provider
   */
  async refreshAccessToken(userId: string, provider: string): Promise<string> {
    const integration = await this.getIntegration(userId, provider);

    if (!integration.refreshToken) {
      throw new Error('No refresh token available');
    }

    // Provider-specific refresh logic would go here
    // This is a placeholder that should be implemented by specific provider services
    this.logger.warn(`Refresh token logic not implemented for ${provider}`);
    return integration.accessToken;
  }
}
