import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ConversationsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, createDto?: CreateConversationDto) {
        return this.prisma.conversation.create({
            data: {
                userId,
                title: createDto?.title || 'Nova Conversa',
            },
            include: {
                messages: true,
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.conversation.findMany({
            where: { userId },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: { messages: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }

    async findOne(userId: string, id: string) {
        const conversation = await this.prisma.conversation.findFirst({
            where: { id, userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!conversation) {
            throw new NotFoundException('Conversa não encontrada');
        }

        return conversation;
    }

    async addMessage(
        userId: string,
        conversationId: string,
        messageDto: SendMessageDto,
    ) {
        await this.findOne(userId, conversationId);

        const message = await this.prisma.message.create({
            data: {
                conversationId,
                role: messageDto.role || 'USER',
                content: messageDto.content,
                metadata: messageDto.metadata ? JSON.stringify(messageDto.metadata) : null,
            },
        });

        // Update conversation timestamp
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });

        return message;
    }

    async getMessages(userId: string, conversationId: string) {
        await this.findOne(userId, conversationId);

        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
        });
    }

    async updateTitle(userId: string, id: string, title: string) {
        await this.findOne(userId, id);

        return this.prisma.conversation.update({
            where: { id },
            data: { title },
        });
    }

    async remove(userId: string, id: string) {
        await this.findOne(userId, id);

        return this.prisma.conversation.delete({
            where: { id },
        });
    }

    async clearMessages(userId: string, conversationId: string) {
        await this.findOne(userId, conversationId);

        await this.prisma.message.deleteMany({
            where: { conversationId },
        });

        return { success: true };
    }
}
