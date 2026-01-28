import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IConversationRepository } from '../../domain/repositories/conversation.repository.interface';
import { ConversationEntity } from '../../domain/entities/conversation.entity';
import { MessageEntity } from '../../domain/entities/message.entity';

/**
 * Conversation Repository - Infrastructure Layer
 *
 * Implementa persistência com Prisma
 */
@Injectable()
export class ConversationRepository implements IConversationRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(conversation: ConversationEntity): Promise<ConversationEntity> {
        const data = conversation.toPlainObject();

        const created = await this.prisma.conversation.create({
            data: {
                id: data.id,
                userId: data.userId,
                title: data.title,
            },
        });

        return this.toDomain(created);
    }

    async findById(id: string, userId: string): Promise<ConversationEntity | null> {
        const conversation = await this.prisma.conversation.findFirst({
            where: { id, userId },
        });

        return conversation ? this.toDomain(conversation) : null;
    }

    async findAll(userId: string): Promise<ConversationEntity[]> {
        const conversations = await this.prisma.conversation.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
        });

        return conversations.map(c => this.toDomain(c));
    }

    async update(conversation: ConversationEntity): Promise<ConversationEntity> {
        const data = conversation.toPlainObject();

        const updated = await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
                title: data.title,
                updatedAt: data.updatedAt,
            },
        });

        return this.toDomain(updated);
    }

    async delete(id: string, userId: string): Promise<void> {
        const conversation = await this.findById(id, userId);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        await this.prisma.conversation.delete({
            where: { id },
        });
    }

    async addMessage(message: MessageEntity): Promise<MessageEntity> {
        const data = message.toPlainObject();

        const created = await this.prisma.message.create({
            data: {
                id: data.id,
                conversationId: data.conversationId,
                role: data.role,
                content: data.content,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            },
        });

        // Update conversation timestamp
        await this.prisma.conversation.update({
            where: { id: message.conversationId },
            data: { updatedAt: new Date() },
        });

        return this.messageToPlain(created);
    }

    async getMessages(conversationId: string): Promise<MessageEntity[]> {
        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
        });

        return messages.map(m => this.messageToPlain(m));
    }

    async clearMessages(conversationId: string): Promise<void> {
        await this.prisma.message.deleteMany({
            where: { conversationId },
        });
    }

    // Mappers

    private toDomain(prismaConversation: any): ConversationEntity {
        return new ConversationEntity(
            prismaConversation.id,
            prismaConversation.userId,
            prismaConversation.title,
            prismaConversation.createdAt,
            prismaConversation.updatedAt,
        );
    }

    private messageToPlain(prismaMessage: any): MessageEntity {
        return new MessageEntity(
            prismaMessage.id,
            prismaMessage.conversationId,
            prismaMessage.role,
            prismaMessage.content,
            prismaMessage.metadata ? JSON.parse(prismaMessage.metadata) : null,
            prismaMessage.createdAt,
        );
    }
}
