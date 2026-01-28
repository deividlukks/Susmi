import { Injectable } from '@nestjs/common';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository.interface';
import { CategorySuggesterService } from '../../domain/services/category-suggester.service';

@Injectable()
export class AutoCategorizeTransactionsUseCase {
    constructor(
        private readonly transactionRepository: ITransactionRepository,
        private readonly categorySuggester: CategorySuggesterService,
    ) {}

    async executeForSingle(userId: string, transactionId: string): Promise<{ categoryId: string | null; categorized: boolean }> {
        const transaction = await this.transactionRepository.findById(transactionId, userId);

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        const categoryId = await this.categorySuggester.suggestCategory(
            userId,
            transaction.getDescription(),
            null
        );

        if (categoryId) {
            await this.transactionRepository.categorize(transactionId, categoryId);
        }

        return { categoryId, categorized: !!categoryId };
    }

    async executeForAll(userId: string): Promise<{ total: number; categorized: number }> {
        const uncategorized = await this.transactionRepository.findUncategorized(userId);

        let categorizedCount = 0;

        for (const tx of uncategorized) {
            const categoryId = await this.categorySuggester.suggestCategory(
                userId,
                tx.getDescription(),
                null
            );

            if (categoryId) {
                await this.transactionRepository.categorize(tx.id, categoryId);
                categorizedCount++;
            }
        }

        return {
            total: uncategorized.length,
            categorized: categorizedCount,
        };
    }
}
