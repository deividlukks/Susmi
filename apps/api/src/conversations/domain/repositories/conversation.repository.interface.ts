import { ConversationEntity } from '../entities/conversation.entity';
import { MessageEntity } from '../entities/message.entity';

export interface IConversationRepository {
    create(conversation: ConversationEntity): Promise<ConversationEntity>;
    findById(id: string, userId: string): Promise<ConversationEntity | null>;
    findAll(userId: string): Promise<ConversationEntity[]>;
    update(conversation: ConversationEntity): Promise<ConversationEntity>;
    delete(id: string, userId: string): Promise<void>;

    // Messages
    addMessage(message: MessageEntity): Promise<MessageEntity>;
    getMessages(conversationId: string): Promise<MessageEntity[]>;
    clearMessages(conversationId: string): Promise<void>;
}
