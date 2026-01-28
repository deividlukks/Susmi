/**
 * Message Entity - DDD
 *
 * Encapsula lógica de negócio de uma mensagem
 */
export class MessageEntity {
    constructor(
        public readonly id: string,
        public readonly conversationId: string,
        private role: 'USER' | 'ASSISTANT' | 'SYSTEM',
        private content: string,
        private metadata: Record<string, any> | null,
        public readonly createdAt: Date,
    ) {
        this.validate();
    }

    // Domain behaviors

    updateContent(newContent: string) {
        if (!newContent || newContent.trim().length === 0) {
            throw new Error('Content cannot be empty');
        }
        this.content = newContent;
    }

    addMetadata(key: string, value: any) {
        if (!this.metadata) {
            this.metadata = {};
        }
        this.metadata[key] = value;
    }

    isFromUser(): boolean {
        return this.role === 'USER';
    }

    isFromAssistant(): boolean {
        return this.role === 'ASSISTANT';
    }

    isSystem(): boolean {
        return this.role === 'SYSTEM';
    }

    getWordCount(): number {
        return this.content.split(/\s+/).length;
    }

    getCharacterCount(): number {
        return this.content.length;
    }

    // Getters
    getRole(): string {
        return this.role;
    }

    getContent(): string {
        return this.content;
    }

    getMetadata(): Record<string, any> | null {
        return this.metadata;
    }

    // Validation
    private validate() {
        if (!this.content || this.content.trim().length === 0) {
            throw new Error('Content is required');
        }
        if (!['USER', 'ASSISTANT', 'SYSTEM'].includes(this.role)) {
            throw new Error('Invalid role');
        }
    }

    // For persistence
    toPlainObject() {
        return {
            id: this.id,
            conversationId: this.conversationId,
            role: this.role,
            content: this.content,
            metadata: this.metadata,
            createdAt: this.createdAt,
        };
    }
}
