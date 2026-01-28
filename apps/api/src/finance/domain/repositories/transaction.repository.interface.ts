import { TransactionEntity } from '../entities/transaction.entity';
import { PaginatedResult } from '../../../common/repositories/base.repository.interface';
import { TransactionType, TransactionFiltersDto } from '../../dto/finance.dto';

export interface TransactionStats {
    totalIncome: number;
    totalExpense: number;
    netIncome: number;
    transactionCount: number;
    byCategory: Array<{
        categoryId: string | null;
        categoryName: string | null;
        total: number;
        count: number;
    }>;
}

export interface ITransactionRepository {
    findById(id: string, userId: string): Promise<TransactionEntity | null>;
    findAll(userId: string, filters: TransactionFiltersDto): Promise<PaginatedResult<TransactionEntity>>;
    create(transaction: TransactionEntity): Promise<TransactionEntity>;
    update(transaction: TransactionEntity): Promise<TransactionEntity>;
    delete(id: string, userId: string): Promise<void>;

    // Transfer specific
    createTransferPair(
        userId: string,
        outgoing: TransactionEntity,
        incoming: TransactionEntity
    ): Promise<TransactionEntity>;

    findTransferPair(transferPairId: string): Promise<TransactionEntity[]>;

    // Statistics
    getStats(userId: string, startDate: Date, endDate: Date): Promise<TransactionStats>;

    getByCategory(
        userId: string,
        startDate: Date,
        endDate: Date,
        type?: TransactionType
    ): Promise<Array<{
        categoryId: string | null;
        categoryName: string | null;
        total: number;
        count: number;
    }>>;

    // Categorization
    findUncategorized(userId: string): Promise<TransactionEntity[]>;
    categorize(transactionId: string, categoryId: string): Promise<void>;
}
