import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

/**
 * Email AI Service - Refatorado com SRP
 *
 * RESPONSABILIDADE ÚNICA: Funcionalidades de IA para emails (summarize, draft reply, categorize)
 * Elimina violação SRP - separado do EmailService principal
 */
@Injectable()
export class EmailAIService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {}

    async summarizeEmail(userId: string, messageId: string) {
        const message = await this.getMessageOrThrow(userId, messageId);

        try {
            const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
            const response = await firstValueFrom(
                this.httpService.post(`${aiServiceUrl}/analyze`, {
                    text: `Subject: ${message.subject || 'No subject'}\n\n${message.body}`,
                    task: 'summarize',
                })
            );

            const summary = response.data.result;

            await this.prisma.communicationMessage.update({
                where: { id: messageId },
                data: { aiSummary: summary },
            });

            return { summary };
        } catch (error) {
            throw new BadRequestException('Failed to summarize email: ' + error.message);
        }
    }

    async draftReply(userId: string, messageId: string, context?: string) {
        const message = await this.getMessageOrThrow(userId, messageId);

        try {
            const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
            const prompt = this.buildReplyPrompt(message, context);

            const response = await firstValueFrom(
                this.httpService.post(`${aiServiceUrl}/chat`, {
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.7,
                })
            );

            return {
                draftReply: response.data.content,
            };
        } catch (error) {
            throw new BadRequestException('Failed to draft reply: ' + error.message);
        }
    }

    async categorizeEmail(userId: string, messageId: string) {
        const message = await this.getMessageOrThrow(userId, messageId);

        try {
            const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
            const response = await firstValueFrom(
                this.httpService.post(`${aiServiceUrl}/analyze`, {
                    text: `Subject: ${message.subject || 'No subject'}\n\n${message.body}`,
                    task: 'classify',
                })
            );

            const categories = response.data.result;

            await this.prisma.communicationMessage.update({
                where: { id: messageId },
                data: { aiCategories: JSON.stringify(categories) },
            });

            return { categories };
        } catch (error) {
            throw new BadRequestException('Failed to categorize email: ' + error.message);
        }
    }

    async batchSummarize(userId: string, messageIds: string[]) {
        const summaries = await Promise.all(
            messageIds.map(id => this.summarizeEmail(userId, id))
        );

        return {
            total: messageIds.length,
            summaries,
        };
    }

    async batchCategorize(userId: string, messageIds: string[]) {
        const results = await Promise.all(
            messageIds.map(id => this.categorizeEmail(userId, id))
        );

        return {
            total: messageIds.length,
            results,
        };
    }

    async extractActionItems(userId: string, messageId: string) {
        const message = await this.getMessageOrThrow(userId, messageId);

        try {
            const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL');
            const response = await firstValueFrom(
                this.httpService.post(`${aiServiceUrl}/analyze`, {
                    text: `Subject: ${message.subject || 'No subject'}\n\n${message.body}`,
                    task: 'extract_action_items',
                })
            );

            return {
                actionItems: response.data.result,
            };
        } catch (error) {
            throw new BadRequestException('Failed to extract action items: ' + error.message);
        }
    }

    // Helper methods

    private async getMessageOrThrow(userId: string, messageId: string) {
        const message = await this.prisma.communicationMessage.findFirst({
            where: { id: messageId, userId },
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        return message;
    }

    private buildReplyPrompt(message: any, context?: string): string {
        return `Draft a professional reply to this email:

Subject: ${message.subject || 'No subject'}
From: ${message.fromAddress}

${message.body}

${context ? `Additional context: ${context}` : ''}`;
    }
}
