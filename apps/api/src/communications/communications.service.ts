import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class CommunicationsService {
    constructor(private readonly prisma: PrismaService) {}

    async createChannel(userId: string, dto: CreateChannelDto) {
        // Encrypt credentials before storing (for production)
        const credentialsJson = JSON.stringify(dto.credentials);
        const metadataJson = JSON.stringify(dto.metadata || {});

        const channel = await this.prisma.communicationChannel.create({
            data: {
                userId,
                type: dto.type,
                provider: dto.provider,
                name: dto.name,
                credentials: credentialsJson,
                metadata: metadataJson,
            },
        });

        return channel;
    }

    async listChannels(userId: string, type?: string) {
        const where: any = { userId };
        if (type) {
            where.type = type;
        }

        const channels = await this.prisma.communicationChannel.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return channels.map((channel) => ({
            ...channel,
            credentials: undefined, // Don't return credentials
        }));
    }

    async getChannel(userId: string, channelId: string) {
        const channel = await this.prisma.communicationChannel.findFirst({
            where: { id: channelId, userId },
        });

        if (!channel) {
            throw new NotFoundException('Channel not found');
        }

        return {
            ...channel,
            credentials: undefined, // Don't return credentials
        };
    }

    async updateChannel(userId: string, channelId: string, dto: UpdateChannelDto) {
        await this.verifyChannelOwnership(userId, channelId);

        const data: any = {};
        if (dto.name) data.name = dto.name;
        if (dto.credentials) data.credentials = JSON.stringify(dto.credentials);
        if (dto.metadata) data.metadata = JSON.stringify(dto.metadata);
        if (dto.isActive !== undefined) data.isActive = dto.isActive;

        const channel = await this.prisma.communicationChannel.update({
            where: { id: channelId },
            data,
        });

        return {
            ...channel,
            credentials: undefined,
        };
    }

    async deleteChannel(userId: string, channelId: string) {
        await this.verifyChannelOwnership(userId, channelId);

        await this.prisma.communicationChannel.delete({
            where: { id: channelId },
        });

        return { message: 'Channel deleted successfully' };
    }

    async verifyChannelOwnership(userId: string, channelId: string) {
        const channel = await this.prisma.communicationChannel.findFirst({
            where: { id: channelId, userId },
        });

        if (!channel) {
            throw new ForbiddenException('Access denied');
        }

        return channel;
    }

    async getChannelWithCredentials(userId: string, channelId: string) {
        const channel = await this.verifyChannelOwnership(userId, channelId);

        return {
            ...channel,
            credentials: JSON.parse(channel.credentials),
            metadata: JSON.parse(channel.metadata),
        };
    }

    async listMessages(
        userId: string,
        channelId?: string,
        page = 1,
        limit = 20,
    ) {
        const skip = (page - 1) * limit;
        const where: any = { userId };

        if (channelId) {
            await this.verifyChannelOwnership(userId, channelId);
            where.channelId = channelId;
        }

        const [messages, total] = await Promise.all([
            this.prisma.communicationMessage.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
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
            }),
            this.prisma.communicationMessage.count({ where }),
        ]);

        return {
            data: messages,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async getMessage(userId: string, messageId: string) {
        const message = await this.prisma.communicationMessage.findFirst({
            where: { id: messageId, userId },
            include: {
                channel: true,
                logs: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!message) {
            throw new NotFoundException('Message not found');
        }

        return message;
    }

    async getMessageStats(userId: string) {
        const [totalChannels, totalMessages, sentMessages, pendingMessages] =
            await Promise.all([
                this.prisma.communicationChannel.count({
                    where: { userId, isActive: true },
                }),
                this.prisma.communicationMessage.count({ where: { userId } }),
                this.prisma.communicationMessage.count({
                    where: { userId, status: 'SENT' },
                }),
                this.prisma.communicationMessage.count({
                    where: { userId, status: 'PENDING' },
                }),
            ]);

        return {
            totalChannels,
            totalMessages,
            sentMessages,
            pendingMessages,
        };
    }
}
