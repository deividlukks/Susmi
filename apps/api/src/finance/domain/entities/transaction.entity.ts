import { TransactionType } from '../../dto/finance.dto';

/**
 * Transaction Entity - DDD
 *
 * Encapsula lógica de negócio e comportamentos de uma transação
 */
export class TransactionEntity {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly accountId: string,
        private type: TransactionType,
        private amount: number,
        private description: string,
        private date: Date,
        private categoryId: string | null,
        private notes: string | null,
        private isPending: boolean,
        private status: string,
        private merchantName: string | null,
        private transferAccountId: string | null,
        private transferPairId: string | null,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
    ) {
        this.validate();
    }

    // Domain behaviors

    complete() {
        if (this.status === 'COMPLETED') {
            throw new Error('Transaction is already completed');
        }
        this.status = 'COMPLETED';
        this.isPending = false;
    }

    cancel() {
        if (this.status === 'CANCELLED') {
            throw new Error('Transaction is already cancelled');
        }
        this.status = 'CANCELLED';
    }

    categorize(categoryId: string) {
        if (!categoryId) {
            throw new Error('Category ID is required');
        }
        this.categoryId = categoryId;
    }

    updateAmount(newAmount: number) {
        if (newAmount <= 0) {
            throw new Error('Amount must be positive');
        }
        this.amount = newAmount;
    }

    updateDescription(newDescription: string) {
        if (!newDescription || newDescription.trim().length === 0) {
            throw new Error('Description cannot be empty');
        }
        this.description = newDescription;
    }

    isTransfer(): boolean {
        return this.type === TransactionType.TRANSFER && !!this.transferAccountId;
    }

    isIncome(): boolean {
        return this.type === TransactionType.INCOME;
    }

    isExpense(): boolean {
        return this.type === TransactionType.EXPENSE;
    }

    isPendingTransaction(): boolean {
        return this.isPending || this.status === 'PENDING';
    }

    // Getters
    getType(): TransactionType {
        return this.type;
    }

    getAmount(): number {
        return this.amount;
    }

    getDescription(): string {
        return this.description;
    }

    getDate(): Date {
        return this.date;
    }

    getCategoryId(): string | null {
        return this.categoryId;
    }

    getStatus(): string {
        return this.status;
    }

    getTransferAccountId(): string | null {
        return this.transferAccountId;
    }

    getTransferPairId(): string | null {
        return this.transferPairId;
    }

    // Validation
    private validate() {
        if (this.amount <= 0) {
            throw new Error('Amount must be positive');
        }
        if (!this.description || this.description.trim().length === 0) {
            throw new Error('Description is required');
        }
        if (this.type === TransactionType.TRANSFER && !this.transferAccountId) {
            throw new Error('Transfer must have a destination account');
        }
    }

    // For persistence
    toPlainObject() {
        return {
            id: this.id,
            userId: this.userId,
            accountId: this.accountId,
            type: this.type,
            amount: this.amount,
            description: this.description,
            date: this.date,
            categoryId: this.categoryId,
            notes: this.notes,
            isPending: this.isPending,
            status: this.status,
            merchantName: this.merchantName,
            transferAccountId: this.transferAccountId,
            transferPairId: this.transferPairId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}
