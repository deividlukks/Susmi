import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
// DDD Architecture
import { ConversationRepository } from './infrastructure/repositories/conversation.repository';

/**
 * Conversations Module - Refatorado com DDD
 *
 * Estrutura DDD leve:
 * - Domain: Entities (Conversation, Message)
 * - Infrastructure: Repository (ConversationRepository)
 * - Legacy: ConversationsService (mantido para compatibilidade)
 */
@Module({
    imports: [PrismaModule],
    controllers: [ConversationsController],
    providers: [
        // DDD Repository
        {
            provide: 'IConversationRepository',
            useClass: ConversationRepository,
        },
        // Legacy Service (mantido para compatibilidade)
        ConversationsService,
    ],
    exports: [
        ConversationRepository,
        ConversationsService,
    ],
})
export class ConversationsModule { }
