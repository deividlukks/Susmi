import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationsService } from '../communications.service';

@Injectable()
export class SchedulingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly communicationsService: CommunicationsService,
    ) {}

    async scheduleMessage(
        userId: string,
        channelId: string,
        dto: {
            to: string[];
            subject?: string;
            body: string;
            htmlBody?: string;
            scheduledFor: string;
            maxRetries?: number;
        },
    ) {
        await this.communicationsService.verifyChannelOwnership(userId, channelId);

        const scheduledFor = new Date(dto.scheduledFor);

        if (scheduledFor <= new Date()) {
            throw new BadRequestException('Scheduled time must be in the future');
        }

        const scheduledMessage = await this.prisma.scheduledMessage.create({
            data: {
                userId,
                channelId,
                status: 'PENDING',
                subject: dto.subject,
                body: dto.body,
                htmlBody: dto.htmlBody,
                toAddresses: JSON.stringify(dto.to),
                scheduledFor,
                maxRetries: dto.maxRetries || 3,
            },
        });

        return {
            message: 'Message scheduled successfully',
            scheduledMessageId: scheduledMessage.id,
            scheduledFor: scheduledMessage.scheduledFor,
        };
    }

    async listScheduledMessages(
        userId: string,
        filters?: { status?: string; channelId?: string },
    ) {
        const where: any = { userId };

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.channelId) {
            await this.communicationsService.verifyChannelOwnership(userId, filters.channelId);
            where.channelId = filters.channelId;
        }

        const messages = await this.prisma.scheduledMessage.findMany({
            where,
            orderBy: { scheduledFor: 'asc' },
            include: {
                channel: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        provider: true,
                    },
                },
            },
        });

        return messages;
    }

    async getScheduledMessage(userId: string, messageId: string) {
        const message = await this.prisma.scheduledMessage.findFirst({
            where: { id: messageId, userId },
            include: {
                channel: true,
            },
        });

        if (!message) {
            throw new NotFoundException('Scheduled message not found');
        }

        return message;
    }

    async updateScheduledMessage(
        userId: string,
        messageId: string,
        dto: {
            scheduledFor?: string;
            body?: string;
            subject?: string;
        },
    ) {
        const message = await this.prisma.scheduledMessage.findFirst({
            where: { id: messageId, userId },
        });

        if (!message) {
            throw new NotFoundException('Scheduled message not found');
        }

        if (message.status !== 'PENDING') {
            throw new BadRequestException('Can only update pending messages');
        }

        const data: any = {};
        if (dto.scheduledFor) data.scheduledFor = new Date(dto.scheduledFor);
        if (dto.body) data.body = dto.body;
        if (dto.subject) data.subject = dto.subject;

        const updated = await this.prisma.scheduledMessage.update({
            where: { id: messageId },
            data,
        });

        return updated;
    }

    async cancelScheduledMessage(userId: string, messageId: string) {
        const message = await this.prisma.scheduledMessage.findFirst({
            where: { id: messageId, userId },
        });

        if (!message) {
            throw new NotFoundException('Scheduled message not found');
        }

        if (message.status !== 'PENDING') {
            throw new BadRequestException('Can only cancel pending messages');
        }

        await this.prisma.scheduledMessage.update({
            where: { id: messageId },
            data: { status: 'CANCELLED' },
        });

        return { message: 'Scheduled message cancelled' };
    }

    async retryFailedMessage(userId: string, messageId: string) {
        const message = await this.prisma.scheduledMessage.findFirst({
            where: { id: messageId, userId },
        });

        if (!message) {
            throw new NotFoundException('Scheduled message not found');
        }

        if (message.status !== 'FAILED') {
            throw new BadRequestException('Can only retry failed messages');
        }

        await this.prisma.scheduledMessage.update({
            where: { id: messageId },
            data: {
                status: 'PENDING',
                retryCount: 0,
                lastError: null,
            },
        });

        return { message: 'Message scheduled for retry' };
    }

    async getPendingMessages(limit = 10): Promise<any[]> {
        const now = new Date();

        return this.prisma.scheduledMessage.findMany({
            where: {
                status: 'PENDING',
                scheduledFor: { lte: now },
            },
            take: limit,
            include: {
                channel: true,
            },
        });
    }

    async markAsProcessing(messageId: string) {
        await this.prisma.scheduledMessage.update({
            where: { id: messageId },
            data: { status: 'PROCESSING' },
        });
    }

    async markAsSent(messageId: string) {
        await this.prisma.scheduledMessage.update({
            where: { id: messageId },
            data: {
                status: 'SENT',
                executedAt: new Date(),
            },
        });
    }

    async markAsFailed(messageId: string, error: string, retryCount: number, maxRetries: number) {
        const newStatus = retryCount >= maxRetries ? 'FAILED' : 'PENDING';

        await this.prisma.scheduledMessage.update({
            where: { id: messageId },
            data: {
                status: newStatus,
                retryCount: retryCount + 1,
                lastError: error,
            },
        });
    }

    async cleanupOldSchedules() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const deleted = await this.prisma.scheduledMessage.deleteMany({
            where: {
                status: { in: ['SENT', 'CANCELLED', 'FAILED'] },
                createdAt: { lt: thirtyDaysAgo },
            },
        });

        return deleted.count;
    }
}
