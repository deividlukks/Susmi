import { Injectable } from '@nestjs/common';
import { ITransactionRepository, TransactionStats } from '../../domain/repositories/transaction.repository.interface';
import { TransactionType } from '../../dto/finance.dto';

@Injectable()
export class GetTransactionStatsUseCase {
    constructor(
        private readonly transactionRepository: ITransactionRepository,
    ) {}

    async execute(userId: string, startDate: Date, endDate: Date): Promise<TransactionStats> {
        return this.transactionRepository.getStats(userId, startDate, endDate);
    }

    async executeByCategory(userId: string, startDate: Date, endDate: Date, type?: TransactionType) {
        return this.transactionRepository.getByCategory(userId, startDate, endDate, type);
    }
}
