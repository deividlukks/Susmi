/**
 * Conversation Entity - DDD
 *
 * Encapsula lógica de negócio de uma conversa
 */
export class ConversationEntity {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        private title: string,
        public readonly createdAt: Date,
        private updatedAt: Date,
    ) {
        this.validate();
    }

    // Domain behaviors

    updateTitle(newTitle: string) {
        if (!newTitle || newTitle.trim().length === 0) {
            throw new Error('Title cannot be empty');
        }
        if (newTitle.length > 200) {
            throw new Error('Title too long (max 200 characters)');
        }
        this.title = newTitle.trim();
        this.touch();
    }

    touch() {
        this.updatedAt = new Date();
    }

    // Getters
    getTitle(): string {
        return this.title;
    }

    getUpdatedAt(): Date {
        return this.updatedAt;
    }

    // Validation
    private validate() {
        if (!this.title || this.title.trim().length === 0) {
            throw new Error('Title is required');
        }
        if (this.title.length > 200) {
            throw new Error('Title too long (max 200 characters)');
        }
    }

    // For persistence
    toPlainObject() {
        return {
            id: this.id,
            userId: this.userId,
            title: this.title,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
